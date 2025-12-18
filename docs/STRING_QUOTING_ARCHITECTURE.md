# Arkkitehtuurianalyysi: Raw Strings ja Merkkijonojen Käsittely

## Core Domain Concept

**Ydinomainen domain-konsepti:** **String Literal Syntax** - IRIS-kielen syntaksin laajennus, joka mahdollistaa merkkijonoliteraalien esittämisen ilman escape-merkintöjä.

Tämä on **kielisyntaksin** ominaisuus, ei runtime-ominaisuus. Raw stringit evaluoituvat tavallisiksi merkkijonoiksi runtime:ssa.

## Sekoittuneet Vastuut (Mixed Responsibilities)

### Ongelma 1: Syntaksi vs. Testaus
**Sekoittunut:**
- Raw strings (syntaksi/kieliominaisuus) 
- wat2wasm validointi (testaus/verifiointi)

**Ongelma:** Suunnitelma sekoittaa kielisyntaksin toteutuksen testausinfrastruktuuriin.

### Ongelma 2: Tokenisointi vs. Semantiikka
**Sekoittunut:**
- Raw string tokenisointi (lexical analysis)
- Kontrollimerkkien semanttinen käsittely (semantic analysis)

**Ongelma:** Kontrollimerkkien käsittely kuuluu tokenisointiin, ei semantiikkaan.

### Ongelma 3: Merkkijonot vs. Tunnisteet
**Sekoittunut:**
- Merkkijonoliteraalit (expressions)
- Tunnisteet/identifikaattorit (syntax)

**Ongelma:** Nämä ovat eri syntaktisia konteksteja, vaikka käyttävät samaa syntaksia.

## Oikea Vastuiden Jako

### 1. Lexical Layer (Tokenizer) - `src/sexp.ts`

**Vastuu:**
- **Raw string tokenisointi:** Tunnistaa `"""` alku- ja loppumerkit
- **Kontrollimerkkien käsittely:** Raw stringeissa kaikki merkit kirjaimellisina (ei escape-käsittelyä)
- **Tavallisten merkkijonojen tokenisointi:** Jatkaa toimimaan kuten ennen (escape-käsittely)

**Ei vastuuta:**
- Semanttinen tulkinta
- Runtime-käsittely
- Tunnisteiden validointi

**Toteutus:**
```typescript
// src/sexp.ts
export type Token =
  | { kind: 'LParen'; line: number; col: number }
  | { kind: 'RParen'; line: number; col: number }
  | { kind: 'Str'; value: string; line: number; col: number }  // Tavallinen merkkijono
  | { kind: 'RawStr'; value: string; line: number; col: number }  // Raw string
  | { kind: 'Symbol'; value: string; line: number; col: number }
  | ...

export function tokenize(input: string): Token[] {
  // ...
  // Tunnistaa """ alku- ja loppumerkit
  // Kaikki merkit (mukaan lukien kontrollimerkit) kirjaimellisina
  // Ei escape-käsittelyä
}
```

### 2. Syntactic Layer (Parser) - `src/sexp.ts`

**Vastuu:**
- **Raw string literaalien parsing:** Muuntaa `RawStr` tokenit `Literal` expressioneiksi
- **Kontekstin tunnistaminen:** Raw stringit toimivat merkkijonoliteraaleina, funktioargumentteina, jne.
- **Tunnisteiden parsing:** Tulevaisuudessa raw stringit tunnisteiden nimissä

**Ei vastuuta:**
- Runtime-semantiikka
- Merkkijonojen sisällön tulkinta
- Testaus/validointi

**Toteutus:**
```typescript
// src/sexp.ts - Parser class
public parseExpr(): Expr {
  // ...
  if (token.kind === 'RawStr') {
    this.consume();
    return { kind: 'Literal', value: { kind: 'Str', value: token.value } };
  }
  // ...
}
```

### 3. Semantic Layer (Type Checker) - `src/typecheck.ts`

**Vastuu:**
- **Tyyppitarkistus:** Raw stringit ovat `Str`-tyyppisiä (ei erillistä tyyppiä)
- **Tunnisteiden validointi:** Tulevaisuudessa raw stringit tunnisteiden nimissä

**Ei vastuuta:**
- Syntaksin parsinta
- Runtime-käsittely
- Tokenisointi

**Toteutus:**
```typescript
// src/typecheck.ts
// Ei muutoksia tarvita - raw stringit ovat Str-tyyppisiä
// Type checker käsittelee ne kuten tavalliset merkkijonot
```

### 4. Runtime Layer (Evaluator) - `src/eval.ts`

**Vastuu:**
- **Evaluointi:** Raw stringit evaluoituvat `Str`-tyyppisiksi arvoiksi
- **Ei muutoksia tarvita:** Raw stringit ovat runtime:ssa tavallisia merkkijonoja

**Ei vastuuta:**
- Syntaksin parsinta
- Tokenisointi
- Tyyppitarkistus

**Toteutus:**
```typescript
// src/eval.ts
// Ei muutoksia tarvita!
// Raw stringit ovat jo evaluoitu Literal-arvoksi parserissa
// Evaluator käsittelee ne kuten tavalliset merkkijonot
```

### 5. Testaus Layer (Test Infrastructure) - `src/test-helpers.ts`, `tests/`

**Vastuu:**
- **wat2wasm validointi:** Varmistaa, että generoitu WASP on validia
- **Testit:** Testaa raw string -syntaksia eri konteksteissa
- **CI/CD integraatio:** Automaattinen validointi

**Ei vastuuta:**
- Syntaksin toteutus
- Runtime-käsittely
- Kielen semantiikka

**Toteutus:**
```typescript
// src/test-helpers.ts
export function validateWatWithWat2Wasm(watSource: string, testName: string): boolean {
  // wat2wasm validointi - erillinen vastuu
}

// tests/tXXX_raw_strings.ts
// Testit raw string -syntaksille
```

## Vastuiden Jako Yhteenvetona

| Vastuu | Tiedosto | Muutokset |
|--------|----------|-----------|
| **Raw string tokenisointi** | `src/sexp.ts` | ✅ Lisätä `RawStr` token, tunnistaa `"""` |
| **Raw string parsing** | `src/sexp.ts` | ✅ Parser käsittelee `RawStr` tokenit |
| **Tyyppitarkistus** | `src/typecheck.ts` | ❌ Ei muutoksia (Str-tyyppi) |
| **Runtime-käsittely** | `src/eval.ts` | ❌ Ei muutoksia (tavalliset merkkijonot) |
| **wat2wasm validointi** | `src/test-helpers.ts` | ✅ Erillinen testausinfrastruktuuri |
| **Testit** | `tests/tXXX_raw_strings.ts` | ✅ Uudet testit |

## Toteutussuunnitelma (Uudelleenorganisoitu)

### Vaihe 1: Lexical Layer (Tokenizer)
**Tiedosto:** `src/sexp.ts`
**Vastuu:** Raw string tokenisointi
- Lisätä `RawStr` token-tyyppi
- Tunnistaa `"""` alku- ja loppumerkit
- Kaikki merkit (mukaan lukien kontrollimerkit) kirjaimellisina
- Ei escape-käsittelyä

### Vaihe 2: Syntactic Layer (Parser)
**Tiedosto:** `src/sexp.ts`
**Vastuu:** Raw string parsing
- Päivittää `parseExpr()` tunnistamaan `RawStr` tokenit
- Palauttaa `Literal` arvo `Str`-tyypillä
- Varmistaa, että raw stringit toimivat kaikissa konteksteissa

### Vaihe 3: Testaus Layer
**Tiedostot:** `tests/tXXX_raw_strings.ts`, `src/test-helpers.ts`
**Vastuu:** Testaus ja validointi
- Testit raw string -syntaksille
- wat2wasm validointi WASP-generoiville testeille
- CI/CD integraatio

### Vaihe 4: Dokumentaatio
**Tiedosto:** `docs/`
**Vastuu:** Dokumentaatio
- Päivittää syntaksidokumentaatio
- Esimerkit raw stringeista

## Yhteenveto

**Core Domain Concept:** String Literal Syntax - kielisyntaksin laajennus

**Vastuiden jako:**
1. **Lexical (Tokenizer):** Raw string tokenisointi
2. **Syntactic (Parser):** Raw string parsing
3. **Semantic (Type Checker):** Ei muutoksia (Str-tyyppi)
4. **Runtime (Evaluator):** Ei muutoksia (tavalliset merkkijonot)
5. **Testaus (Test Infrastructure):** wat2wasm validointi erillisenä

**Sekoittuneet vastuut korjattu:**
- ✅ Syntaksi erotettu testauksesta
- ✅ Tokenisointi erotettu semantiikasta
- ✅ Merkkijonot erotettu tunnisteista (tulevaisuudessa)

