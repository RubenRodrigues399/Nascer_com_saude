/**
 * Valida se o formato do BI Angolano é válido (9 números + 2 letras + 3 números)
 * Exemplo válido: 000123456LA041
 */
export function validateBI(bi: string): boolean {
    // Regex para o padrão do BI angolano (insensível a maiúsculas/minúsculas)
    const biRegex = /^\d{9}[A-Z]{2}\d{3}$/i;
    return biRegex.test(bi.trim());
  }