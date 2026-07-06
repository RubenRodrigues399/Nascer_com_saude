/**
 * Valida se o formato do BI Angolano é válido (9 números + 2 letras + 3 números)
 * Exemplo válido: 000123456LA041
 */
export function validateBI(bi: string): boolean {
    // Regex para o padrão do BI angolano (insensível a maiúsculas/minúsculas)
    const biRegex = /^\d{9}[A-Z]{2}\d{3}$/i;
    return biRegex.test(bi.trim());
  }

/** Verifica se a validade de um documento já passou (data anterior a hoje). */
export function isExpiredDate(dateStr: string): boolean {
  if (!dateStr) return false;
  return dateStr < getTodayStr();
}

/**
 * Verificação genérica de plausibilidade para nº de passaporte — não é o formato
 * oficial angolano (que não está documentado no sistema), apenas alfanumérico
 * com 6 a 10 caracteres, para apanhar erros óbvios de digitação.
 */
export function validatePassportNumber(docNumber: string): boolean {
  return /^[A-Z0-9]{6,10}$/i.test(docNumber.trim());
}

/** Data de hoje no formato usado pelos <input type="date"> (YYYY-MM-DD) */
export function getTodayStr(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Compara strings de data no formato YYYY-MM-DD (comparação lexicográfica,
 * válida porque o formato ISO é sempre zero-padded e ordena cronologicamente).
 */
export function isFutureDate(dateStr: string): boolean {
  if (!dateStr) return false;
  return dateStr > getTodayStr();
}

/** Idade completa (em anos) de alguém nascido em birthDateStr, à data de refDateStr (hoje por omissão). */
export function getAgeYears(birthDateStr: string, refDateStr: string = getTodayStr()): number {
  const birth = new Date(birthDateStr);
  const ref = new Date(refDateStr);
  let age = ref.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = ref.getUTCMonth() - birth.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && ref.getUTCDate() < birth.getUTCDate())) age--;
  return age;
}

/**
 * Valida o nome completo: pelo menos 2 palavras, só letras (com acentos), hífen ou apóstrofo.
 */
export function validateFullName(name: string): boolean {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return false;
  const wordRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ'-]+$/;
  return words.every(w => w.length >= 2 && wordRegex.test(w));
}

/**
 * Valida a data de nascimento de um progenitor (mãe/pai) face à data de nascimento do filho:
 * não pode ser no futuro, tem de ser anterior à do filho, e com um intervalo mínimo plausível.
 * Devolve a mensagem de erro, ou null se estiver tudo certo.
 */
export function validateParentBirthDate(
  parentBirthDate: string,
  childBirthDate: string,
  minGapYears = 14,
): string | null {
  if (!parentBirthDate) return null; // presença é validada à parte
  if (isFutureDate(parentBirthDate)) return 'Data de nascimento não pode ser no futuro.';
  if (!childBirthDate || isFutureDate(childBirthDate)) return null; // ainda não há data do filho para comparar
  if (parentBirthDate >= childBirthDate) return 'Deve ter nascido antes do recém-nascido.';
  if (getAgeYears(parentBirthDate, childBirthDate) < minGapYears) {
    return `Idade incompatível com a do recém-nascido (mínimo ${minGapYears} anos de diferença).`;
  }
  return null;
}

/**
 * Valida a data de nascimento de uma testemunha: maioridade (18 anos) e nascimento anterior ao do filho.
 */
export function validateWitnessBirthDate(witnessBirthDate: string, childBirthDate: string): string | null {
  if (!witnessBirthDate) return null; // presença é validada à parte
  if (isFutureDate(witnessBirthDate)) return 'Data de nascimento não pode ser no futuro.';
  if (getAgeYears(witnessBirthDate) < 18) return 'A testemunha deve ser maior de idade (18 anos).';
  if (childBirthDate && !isFutureDate(childBirthDate) && witnessBirthDate >= childBirthDate) {
    return 'Deve ter nascido antes do recém-nascido.';
  }
  return null;
}