/**
 * API 입력 검증 유틸리티
 * 체이닝 가능한 경량 검증기 - 외부 의존성 없음
 */

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  data: Record<string, any>;
}

type Rule = (value: any, field: string) => string | null;

class FieldValidator {
  private rules: Rule[] = [];
  private _optional = false;

  optional(): this {
    this._optional = true;
    return this;
  }

  string(minLen = 0, maxLen = 10000): this {
    this.rules.push((v, f) => {
      if (typeof v !== 'string') return `${f}은(는) 문자열이어야 합니다.`;
      if (v.length < minLen) return `${f}은(는) 최소 ${minLen}자 이상이어야 합니다.`;
      if (v.length > maxLen) return `${f}은(는) 최대 ${maxLen}자를 초과할 수 없습니다.`;
      return null;
    });
    return this;
  }

  number(min?: number, max?: number): this {
    this.rules.push((v, f) => {
      const n = typeof v === 'string' ? Number(v) : v;
      if (typeof n !== 'number' || isNaN(n)) return `${f}은(는) 숫자여야 합니다.`;
      if (min !== undefined && n < min) return `${f}은(는) ${min} 이상이어야 합니다.`;
      if (max !== undefined && n > max) return `${f}은(는) ${max} 이하여야 합니다.`;
      return null;
    });
    return this;
  }

  integer(min?: number, max?: number): this {
    this.rules.push((v, f) => {
      const n = typeof v === 'string' ? Number(v) : v;
      if (!Number.isInteger(n)) return `${f}은(는) 정수여야 합니다.`;
      if (min !== undefined && n < min) return `${f}은(는) ${min} 이상이어야 합니다.`;
      if (max !== undefined && n > max) return `${f}은(는) ${max} 이하여야 합니다.`;
      return null;
    });
    return this;
  }

  email(): this {
    this.rules.push((v, f) => {
      if (typeof v !== 'string') return `${f}은(는) 문자열이어야 합니다.`;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return `${f} 형식이 올바르지 않습니다.`;
      return null;
    });
    return this;
  }

  enum(values: readonly string[]): this {
    this.rules.push((v, f) => {
      if (!values.includes(v)) return `${f}은(는) [${values.join(', ')}] 중 하나여야 합니다.`;
      return null;
    });
    return this;
  }

  pattern(regex: RegExp, message?: string): this {
    this.rules.push((v, f) => {
      if (typeof v !== 'string' || !regex.test(v)) return message || `${f} 형식이 올바르지 않습니다.`;
      return null;
    });
    return this;
  }

  custom(fn: (value: any) => string | null): this {
    this.rules.push((v, _f) => fn(v));
    return this;
  }

  validate(value: any, field: string): string | null {
    if (value === undefined || value === null || value === '') {
      if (this._optional) return null;
      return `${field}은(는) 필수 입력입니다.`;
    }
    for (const rule of this.rules) {
      const err = rule(value, field);
      if (err) return err;
    }
    return null;
  }
}

/**
 * 스키마 기반 검증
 * @example
 * const result = validate(body, {
 *   username: v().string(3, 20).pattern(/^[a-zA-Z0-9_]+$/),
 *   email: v().email(),
 *   page: v().optional().integer(1, 100),
 * });
 */
export function validate(
  data: Record<string, any>,
  schema: Record<string, FieldValidator>
): ValidationResult {
  const errors: ValidationError[] = [];
  const cleaned: Record<string, any> = {};

  for (const [field, validator] of Object.entries(schema)) {
    const err = validator.validate(data[field], field);
    if (err) {
      errors.push({ field, message: err });
    } else if (data[field] !== undefined && data[field] !== null) {
      cleaned[field] = data[field];
    }
  }

  return { valid: errors.length === 0, errors, data: cleaned };
}

/** 필드 검증기 생성 */
export function v(): FieldValidator {
  return new FieldValidator();
}

/**
 * 쿼리 파라미터 안전 추출
 */
export function safeInt(value: string | null, defaultVal: number, min?: number, max?: number): number {
  if (!value) return defaultVal;
  const n = parseInt(value, 10);
  if (isNaN(n)) return defaultVal;
  let result = n;
  if (min !== undefined) result = Math.max(result, min);
  if (max !== undefined) result = Math.min(result, max);
  return result;
}

export function safeString(value: string | null, maxLen = 1000): string {
  if (!value) return '';
  return value.slice(0, maxLen).trim();
}
