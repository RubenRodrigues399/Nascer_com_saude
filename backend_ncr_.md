# Nascer com Registo (NCR) — Informações Reais do Backend

> Documento de referência técnica compilado a partir das respostas do Silk Manuel (Backend Developer) sobre a implementação real da API. Substitui qualquer suposição anterior sobre a arquitetura do backend nos diagramas UML e manuais do projeto.

---

## 1. Estrutura e Organização do Código

- **Arquitetura:** o projeto segue **arquitetura hexagonal** (Ports & Adapters).
  - Implicação para o Diagrama de Componentes: deve representar-se a separação entre **domínio/núcleo** (regras de negócio, entidades), **portas** (interfaces de entrada/saída) e **adaptadores** (controllers REST como adaptadores de entrada; repositórios/CockroachDB como adaptadores de saída).
  - *Pendente confirmar:* nomes reais dos pacotes (ex: `domain`, `application`, `infrastructure`/`adapters`) para desenhar o diagrama de componentes com fidelidade.

---

## 2. Autenticação e Autorização

- **Sessão única por profissional:** o sistema **não permite novo login** se já existir uma sessão ativa noutro navegador/dispositivo para o mesmo profissional.
- **Timeout de sessão:** no frontend, após **15 minutos sem qualquer atividade**, é feito **logout automático**.
- **RF07 (bloqueio de conta após tentativas inválidas):** *ainda não confirmado em detalhe* — a resposta recebida cobriu a regra de sessão única e timeout, mas não especificou se existe um número máximo de tentativas de login falhadas que bloqueia a conta. **Pergunta em aberto para o Silk.**
- Fluxo de autenticação (via endpoints confirmados na secção 4): `login` → `validateOTP` (parece haver 2FA/OTP) → obtenção de `token`/`refresh-token` → `logout`.
- Recuperação de senha: `verifyPhoneNumber-recover` → `recover-password` → `changePassword/{professionalId}`.

---

## 3. Fluxos de Negócio Confirmados (via documentação Swagger/OpenAPI)

**Fonte:** API "Nascer com Registo (NCR)" — OpenAPI 3.0, `/v3/api-docs/public`, servidor: `https://api-registro-civil-ixfv.onrender.com`

> Responsável pela gestão do processo de registo de nascimento de cidadãos, permitindo cadastro, consulta, atualização e auditoria das informações relacionadas ao nascimento. Licença Apache 2.0, sob tutela do MINJUST (Suporte: "Serviço de Registo Civil").

### 3.1 Fluxo Administrativo Inicial (setup do sistema)
1. Criar um **profissional do tipo Super Administrativo**, associado ao bairro "Dangereux" (bairro de bootstrap/seed).
2. Autenticar-se na plataforma (login).
3. Criar as **províncias**.
4. Criar os **municípios**.
5. Criar **bairros** (opcional).
6. Criar **unidades** (maternidades/unidades sanitárias).
7. Criar **profissionais** (Técnico/Administrativo).
8. Sistema gera automaticamente um **NCR (Número de Controlo de Registo)** único quando aplicável.
9. Todas as operações são registadas para **auditoria**.

### 3.2 Fluxo Operacional Principal (uso diário nas maternidades)
1. Profissional autentica-se no sistema.
2. Sistema valida a **unidade sanitária** e as **permissões** do profissional.
3. São cadastrados os **dados do recém-nascido**.
4. São cadastrados os **dados dos pais, representantes e testemunhas**.
5. Sistema realiza as **validações necessárias**.
6. É gerado o **NCR** único, automaticamente.
7. Todas as operações ficam registadas para **auditoria**.

### 3.3 Principais Funcionalidades (nível de sistema)
- Autenticação e autorização
- Auditoria das operações
- Gestão de cidadãos (indivíduos)
- Gestão de profissionais
- Gestão de unidades sanitárias
- Gestão da divisão administrativa (Província → Município → Bairro)
- Gestão de crianças, com emissão automática de NCR

---

## 4. Endpoints da API (confirmados via Swagger)

### 4.1 Indivíduo / Cidadão
| Método | Rota | Descrição |
|---|---|---|
| PUT | `/dnirn/individual` | Actualizar informação de um cidadão |
| GET | `/dnirn/individual/byPhoneNumber/{phonenumber}` | Carregar informações de um indivíduo |
| GET | `/dnirn/individual/byIndentificationNumber/{indentificationNumber}` | Carregar informações de um indivíduo |
| GET | `/dnirn/individual/all` | Carregar todos os indivíduos |

### 4.2 Filhos / Crianças
| Método | Rota | Descrição |
|---|---|---|
| PUT | `/dnirn/child` | Actualizar criança |
| POST | `/dnirn/child` | Registar criança |
| POST | `/dnirn/child/addFather` | Adicionar dados do pai |
| GET | `/dnirn/child/childById/{childId}` | Carregar criança pelo ID |
| GET | `/dnirn/child/childByDNV/{dnv}` | Carregar criança pelo DNV |
| GET | `/dnirn/child/byUnity/{unityId}` | Carregar todas as crianças de uma unidade |
| GET | `/dnirn/child/all` | Carregar todas as crianças |
| DELETE | `/dnirn/child/{id}` | Eliminar uma criança |

> Nota: existe endpoint separado `addFather` — sugere que a criança pode ser registada inicialmente sem o pai, e o pai é adicionado num passo posterior (relevante para o diagrama de sequência de registo).

#### 4.2.1 Algoritmo de Geração do DNV / NCR

O **NCR (Número de Controlo de Registo)** — também referido como **DNV** nos endpoints (`childByDNV`) — é gerado automaticamente pelo sistema segundo a seguinte fórmula:

```
DNV = "NCR-" || {ID da unidade} || "-" || {TS} || "-" || {SUB(0..6)}
```

**Componentes:**

| Componente | Significado |
|---|---|
| `\|\|` | Operador de concatenação — junção física dos blocos de texto |
| `"NCR-"` | Prefixo fixo, identifica o tipo de número (Número de Controlo de Registo) |
| `{ID da unidade}` | Identificador da unidade sanitária/maternidade onde o registo foi feito |
| `{TS}` | Valor numérico de `System.currentTimeMillis()` (timestamp em milissegundos), codificado em **Base62** |
| `{SUB(0..6)}` | Os primeiros 6 caracteres alfanuméricos do **UUID do profissional**, codificado em **Base62** |

**Exemplo real:** `NCR01-VO2ES59-4BI0SR`

> Nota de leitura do exemplo: `NCR01` funciona como prefixo + ID da unidade concatenados sem separador visível nesse caso específico (unidade "01"), seguido do TS em Base62 (`VO2ES59`) e do trecho do UUID do profissional em Base62 (`4BI0SR`). Vale confirmar com o Silk se o separador entre `"NCR-"` e `{ID da unidade}` é omitido/normalizado quando a unidade é referenciada por um código curto (ex: "01").

**Implicações para os diagramas:**
- **Diagrama de Sequência (registo de criança):** deve incluir o passo explícito "Sistema gera DNV" com a chamada a `System.currentTimeMillis()` + codificação Base62 + leitura do UUID do profissional autenticado, antes da persistência final do registo.
- **Diagrama de Classes:** sugere a existência de um método/serviço utilitário (ex: `DnvGeneratorService` ou similar) que depende de `Unity.id` e do `Professional.uuid` — vale confirmar o nome real da classe/serviço com o Silk.
- **Garantia de unicidade:** a combinação timestamp + fragmento de UUID sugere baixa probabilidade de colisão, mas não é uma garantia matemática absoluta — pode valer a pena perguntar se há verificação de unicidade na base de dados (constraint `UNIQUE`) antes de confirmar o registo.

### 4.3 Províncias
| Método | Rota | Descrição |
|---|---|---|
| POST | `/dnirn/provinces` | Registar província |
| DELETE | `/dnirn/provinces/{provinceId}` | Apagar província |
| PATCH | `/dnirn/provinces/{provinceId}` | Editar província |
| GET | `/dnirn/provinces/all` | Listar províncias |

### 4.4 Profissionais
| Método | Rota | Descrição |
|---|---|---|
| POST | `/dnirn/professionals/super` | Registar super profissional |
| POST | `/dnirn/professionals/` | Registar profissional |
| GET | `/dnirn/professionals/{professionalId}` | Obter profissional por ID |
| DELETE | `/dnirn/professionals/{professionalId}` | Eliminar profissional |
| GET | `/dnirn/professionals/verifyPhoneNumber-recover/{phoneNumber}` | Verificar utilizador (recuperar senha) |
| GET | `/dnirn/professionals/byPhoneNumber/{phoneNumber}` | Consultar profissional pelo nº de telefone |
| GET | `/dnirn/professionals/byPhoneNumber-token/{phoneNumber}` | (sem descrição fornecida) |
| GET | `/dnirn/professionals/all` | Listar profissionais |

### 4.5 Bairros
| Método | Rota | Descrição |
|---|---|---|
| POST | `/dnirn/neighborhoods` | Registar bairro |
| GET | `/dnirn/neighborhoods/{id}` | Obter bairro por ID |
| PATCH | `/dnirn/neighborhoods/{id}` | Actualizar bairro |
| GET | `/dnirn/neighborhoods/byMunicipalityId/{municipalityId}` | Listar bairros por município |
| GET | `/dnirn/neighborhoods/all` | Carregar todos os bairros |
| DELETE | `/dnirn/neighborhoods/{neighborhoodId}` | Apagar bairro |

### 4.6 Municípios
| Método | Rota | Descrição |
|---|---|---|
| POST | `/dnirn/municipalities` | Registar município |
| DELETE | `/dnirn/municipalities/{municipalityId}` | Eliminar município |
| PATCH | `/dnirn/municipalities/{municipalityId}` | Editar município |
| GET | `/dnirn/municipalities/{id}` | Obter município por ID |
| GET | `/dnirn/municipalities/byProvinceId/{provinceId}` | Listar municípios por província |

### 4.7 Autenticação dos Profissionais
| Método | Rota | Descrição |
|---|---|---|
| POST | `/dnirn/auth/validateOTP` | Validar OTP |
| POST | `/dnirn/auth/refresh-token` | Renovar token de acesso |
| POST | `/dnirn/auth/recover-password` | Recuperação de senha |
| POST | `/dnirn/auth/logout` | Encerrar sessão |
| POST | `/dnirn/auth/login` | Login do profissional |
| POST | `/dnirn/auth/changePassword/{professionalId}` | Alterar palavra-passe |

> **Nota:** não foram fornecidas as rotas de **Unidades** (mencionadas no índice do Swagger como secção "Unidades", mas sem endpoints listados) nem os **Schemas** completos (modelos de request/response). Estes já são consumidos parcialmente pelo frontend (`services/unidades.ts`), mas os endpoints exatos e os schemas formais do OpenAPI ainda não foram colados aqui.

---

## 5. Base de Dados (CockroachDB)

**Estado: sem informação fornecida ainda.** Pontos a esclarecer com o Silk:
- Existe schema/diagrama ER já desenhado?
- Ficheiros de migration (Flyway/Liquibase)?
- Confirmação da hierarquia territorial como FKs rígidas (Província → Município → Bairro), tal como sugerido pelo consumo no frontend.
- Modelo de `Individual` (se é uma tabela genérica partilhada por Mãe/Pai/Testemunha/Criança/Profissional, ou tabelas separadas).

---

## 6. Infraestrutura e Implantação

- **Backend hospedado em:** **Render** — confirmado. URL do servidor: `https://api-registro-civil-ixfv.onrender.com`
- **Base de dados:** CockroachDB (confirmado no início do projeto; hospedagem específica ainda não confirmada — self-hosted vs. CockroachDB Cloud).
- **Documentação da API:** disponível via OpenAPI 3.0 em `/v3/api-docs/public` (Swagger).
- **Licença do projeto (API):** Apache 2.0.
- **Suporte institucional:** "Suporte Serviço de Registo Civil - MINJUST", com website e e-mail de contacto próprios.

*Pendente confirmar:* processo de deploy (CI/CD, Docker ou deploy manual no Render), variáveis de ambiente do backend, estratégia de backups da base de dados.

---

## 7. Perguntas Ainda em Aberto (para próxima ronda com o Silk)

1. RF07 — existe limite de tentativas de login falhadas que bloqueia a conta?
2. Estrutura real de pacotes da arquitetura hexagonal (nomes de camadas/pastas).
3. Endpoints e schema da secção "Unidades" (não detalhados no Swagger colado).
4. Schemas/DTOs completos do Swagger (request/response bodies).
5. Modelo de dados da CockroachDB (entidades, relações, migrations).
6. Processo de deploy/CI-CD no Render.
7. Existem testes automatizados no backend (JUnit, Mockito, etc.)?
8. O DNV/NCR tem uma constraint `UNIQUE` na base de dados, ou a unicidade depende apenas da combinação estatística timestamp + fragmento de UUID?
9. Qual é o nome real da classe/serviço responsável por gerar o DNV (para referenciar corretamente no Diagrama de Classes)?

---

*Última atualização: com base nas respostas recebidas em 13 de julho de 2026. Este documento deve ser atualizado sempre que novas respostas forem obtidas do Silk Manuel.*
