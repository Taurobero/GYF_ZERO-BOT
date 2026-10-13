const tokenPattern = /\s*(?:(\d+(?:\.\d+)?|\.\d+)|([()+*/-]))/gy;

export function calculate(expression) {
  expression = expression.trim();
  if (expression.length > 200) throw new Error('La operación es demasiado larga.');
  const tokens = [];
  let position = 0;
  while (position < expression.length) {
    tokenPattern.lastIndex = position;
    const match = tokenPattern.exec(expression);
    if (!match) throw new Error('Usa solo números, +, -, *, / y paréntesis.');
    tokens.push(match[1] ?? match[2]);
    position = tokenPattern.lastIndex;
  }
  if (tokens.length === 0) throw new Error('Escribe una operación.');

  let cursor = 0;
  function factor() {
    const token = tokens[cursor++];
    if (token === '+' || token === '-') {
      const value = factor();
      return token === '-' ? -value : value;
    }
    if (token === '(') {
      const value = sum();
      if (tokens[cursor++] !== ')') throw new Error('Falta un paréntesis de cierre.');
      return value;
    }
    if (token === undefined || token === ')') throw new Error('La operación está incompleta.');
    return Number(token);
  }

  function product() {
    let value = factor();
    while (tokens[cursor] === '*' || tokens[cursor] === '/') {
      const operator = tokens[cursor++];
      const right = factor();
      if (operator === '/' && right === 0) throw new Error('No se puede dividir entre cero.');
      value = operator === '*' ? value * right : value / right;
    }
    return value;
  }

  function sum() {
    let value = product();
    while (tokens[cursor] === '+' || tokens[cursor] === '-') {
      const operator = tokens[cursor++];
      const right = product();
      value = operator === '+' ? value + right : value - right;
    }
    return value;
  }

  const result = sum();
  if (cursor !== tokens.length || !Number.isFinite(result)) throw new Error('Operación no válida.');
  return result;
}