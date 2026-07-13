# Nascer com Registo (NCR) — Planeamento de Sprints

> ⚠️ **Nota de transparência metodológica:** este documento é uma **reconstrução lógica** das sprints do projecto, feita a partir de screenshots parciais de um board (Trello ou similar) e das datas visíveis nos cartões. Não é uma cópia fiel de um board completo com sprints explicitamente nomeadas — é uma inferência razoável baseada em: (1) datas confirmadas nos cartões da fase inicial, (2) duração de sprint de 2 semanas, e (3) ordem lógica de dependência técnica entre tarefas (autenticação antes de CRUDs, CRUDs antes de registo de crianças, etc.). **Deve ser validado e ajustado pela equipa (em particular o Scrum Master, Mvevo Nsiese) antes de ser tratado como facto definitivo no Relatório Geral.**

---

## Parâmetros da reconstrução

- **Data de início do projecto:** 16 de Maio de 2026 (confirmado pelos cartões do board)
- **Duração das Sprints 1 a 4:** 2 semanas cada
- **Data de encerramento do projecto:** 18 de Julho de 2026 — Sprint 5 ajustada para 1 semana (11–18 Jul) para fechar o projecto nesta data, já que o desenvolvimento está concluído e a equipa se encontra apenas em fase de testes finais/documentação.
- **Data de referência ("hoje"):** 13 de Julho de 2026

## Calendário de Sprints

| Sprint | Período | Estado |
|---|---|---|
| Sprint 1 | 16 Mai – 30 Mai 2026 | Concluída |
| Sprint 2 | 30 Mai – 13 Jun 2026 | Concluída |
| Sprint 3 | 13 Jun – 27 Jun 2026 | Concluída |
| Sprint 4 | 27 Jun – 11 Jul 2026 | Concluída |
| Sprint 5 | 11 Jul – 18 Jul 2026 | **Concluída** — desenvolvimento terminado; equipa em fase de testes finais e encerramento da documentação |

---

## Sprint 1 (16–30 Mai) — Fundação e planeamento

Cartões com data confirmada no board:

| Cartão | Descrição |
|---|---|
| 1.0 GP | Confirmar existência de API para validação de BI |
| 2.0 GP | Mapear campos obrigatórios do formulário segundo a lei angolana |
| 3.0 FE | Wireframes do formulário e fluxo do conservador |
| 4.0 BE | Montar ambiente de desenvolvimento |
| 5.0 BE | Decisão de arquitectura offline-first e documentação no repo |
| 6.0 BE | Criar repositório e configurar ferramentas |
| 7.0 GP | Resolver bloqueio do PC do Dev Front End |

---

## Sprint 2 (30 Mai – 13 Jun) — Autenticação e base do backend *(inferida)*

| Tarefa | Responsável |
|---|---|
| Criar super profissional (endpoint + regra de negócio) | Silk Manuel (SM) |
| Login de profissional (JWT) | SM |
| Guard de sessão e controlo de roles | SM |
| Logout (invalidar token) | SM |
| Recuperar senha (reset por email) | SM |
| Alterar senha (perfil autenticado) | SM |
| Ecrã de login | Rúben Rodrigues (RR) |
| Ecrã de recuperar e alterar senha | RR |
| Botão e fluxo de logout | RR |

---

## Sprint 3 (13–27 Jun) — Gestão territorial e profissionais *(inferida)*

| Tarefa | Responsável |
|---|---|
| Criar profissionais (TEC e ADMIN) | SM |
| RUD profissionais | SM |
| CRUD províncias | SM |
| CRUD municípios | SM |
| CRUD bairros | SM |
| CRUD unidades | SM |
| Gestão de profissionais (listagem e formulário) | RR |
| Gestão geográfica (províncias, municípios, bairros) | RR |
| Gestão de unidades | RR |

---

## Sprint 4 (27 Jun – 11 Jul) — Registo de crianças e testes *(inferida)*

| Tarefa | Responsável |
|---|---|
| Cadastrar e gerir crianças (API) | SM |
| Cadastro e listagem de crianças | RR |
| Testes E2E — fluxo completo frontend | RR |
| Testes de integração — todos os endpoints | André Lubambi (AL), RR, SM |

---

## Sprint 5 (11–18 Jul) — Documentação e encerramento *(concluída, inferida)*

Sprint final, encurtada para 1 semana para fechar o projecto a 18 de Julho — o desenvolvimento (backend + frontend) já estava terminado ao entrar nesta sprint; o trabalho restante é documentação e testes finais.

| Tarefa | Responsável | Estado |
|---|---|---|
| Levantamento e validação dos requisitos finais | AL | Concluído |
| Relatório geral | AL | Concluído |
| Relatório técnico — documentação de engenharia | AL, Mvevo Nsiese (MJ) | Concluído |
| Manual do Utilizador | Mvevo Nsiese | Concluído |
| Manual de Instalação | Mvevo Nsiese | Concluído |
| 21 Diagramas UML | André Lubambi | Concluído |
| Testes finais (integração/E2E) | AL, RR, SM | Em validação/encerramento |

---

## Pendente de validação com a equipa

1. Confirmar com o Mvevo Nsiese (Scrum Master) se esta distribuição por sprint corresponde à realidade do board.
2. Confirmar datas exactas de transição entre sprints (podem não ter sido rígidas de 2 semanas se houve bloqueios, como sugere o cartão "7.0 GP - Resolver bloqueio do PC do Dev Front End").
3. Confirmar se há cartões/tarefas do board que não foram capturados nos screenshots disponíveis (ex: sprints adicionais entre Jun-Jul não visíveis).

---

*Documento criado em 13 de Julho de 2026 e actualizado na mesma data para reflectir o encerramento do projecto a 18 de Julho de 2026 (Sprint 5 encurtada para 1 semana). Desenvolvimento concluído; equipa em fase de testes finais e fecho da documentação. Actualizar sempre que houver confirmação directa da equipa sobre o board real de sprints.*