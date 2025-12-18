# Suunnitelma: Raw Strings ja Merkkijonojen Käsittely IRIS-kielessä

## Ongelma

IRIS-kieli ja WebAssembly-tekstimuoto (WASP) käyttävät molemmat lainausmerkkejä `"`, mikä aiheuttaa ongelmia, kun IRIS-koodissa on WASP-tekstiä merkkijonona. Lisäksi kontrollimerkit (newline, tab, jne.) ja erikoismerkit tunnisteissa aiheuttavat ongelmia.

**Esimerkki ongelmista:**
```iris
; Ongelma 1: Lainausmerkit WASP-tekstissä
(str.concat "(i64.add (local.get $t0) (i64.const " (str.concat (i64.to_string (+ 8 i)) ")))")

; Ongelma 2: Kontrollimerkit
(let (s "line1\nline2\tindented")
  s)  ; \n ja \t escapettava

; Ongelma 3: Tunnisteet erikoismerkeillä
(deffn (name "my-function") ...)  ; Ei toimi, koska " on merkkijonomerkki
```

## Vaihtoehdot

### Vaihtoehto 1: Escape-merkintöjen parantaminen (Nopein ratkaisu)
**Kuvaus:** Varmistetaan, että escape-merkinnät (`\"`) toimivat luotettavasti kaikissa tapauksissa.

**Edut:**
- Ei vaadi syntaksin muutoksia
- Yhteensopiva olemassa olevan koodin kanssa
- Helppo toteuttaa

**Haitat:**
- WASP-tekstin sisällä olevat lainausmerkit pitää escapettaa manuaalisesti
- Virhealtista ja hankalaa pitkissä WASP-merkkijonoissa
- Koodi muuttuu vaikealukuiseksi

**Toteutus:**
- Varmistetaan, että `sexp.ts`:n escape-käsittely toimii oikein
- Testataan kaikki escape-sekvenssit
- Dokumentoidaan escape-syntaksi

**Aikataulu:** 1-2 tuntia

---

### Vaihtoehto 2: Raw Strings (Kolmoislainausmerkit `"""`) - **SUOSITELTU**
**Kuvaus:** Lisätään raw string -tyyppi, joka ei tulkitse escape-merkintöjä. Ratkaisu on **jaettu** - se toimii kaikissa konteksteissa: merkkijonot, tunnisteet, ja muut arvot.

**Syntaksi:**
```iris
; Merkkijonot
(str.concat """(i64.add (local.get $t0) (i64.const """ (str.concat (i64.to_string (+ 8 i)) """)))""")

; Kontrollimerkit (ei escapeta)
(let (s """line1
line2	indented""")
  s)  ; Sisältää todellisen newline ja tab-merkin

; Tunnisteet (tulevaisuudessa)
(deffn (name """my-function""") ...)  ; Tunniste raw stringinä
```

**Edut:**
- **Jaettu ratkaisu:** Toimii merkkijonoissa, tunnisteissa ja kaikissa konteksteissa
- Ei tarvitse escapettaa lainausmerkkejä
- Kontrollimerkit käsitellään luonnollisesti (ei escapeta)
- Luettavampi koodi
- Yleinen ratkaisu monissa kielissä (Python, Rust, Go)
- Yhteensopiva olemassa olevan koodin kanssa (tavalliset merkkijonot toimivat edelleen)

**Haitat:**
- Vaatii syntaksin muutoksen
- Vaikeampi toteuttaa (mutta arvokas)

**Toteutus:**
1. Lisätä `RawStr` token-tyyppi `sexp.ts`:ään
2. Päivittää tokenizer tunnistamaan `"""` alku- ja loppumerkit
3. Käsitellä kontrollimerkit raw stringeissa (ei escapeta)
4. Päivittää parseri käsittelemään raw stringeja
5. Päivittää AST:aan raw string -tuki
6. Päivittää evaluaattori käsittelemään raw stringeja
7. Tulevaisuudessa: tuki raw stringeille tunnisteissa

**Aikataulu:** 6-8 tuntia (kontrollimerkit + tunnisteet)

---

### Vaihtoehto 3: Template Literals (Backtick-syntaksi)
**Kuvaus:** Lisätä template literal -tyyppi, joka sallii interpolointia ja moniriviset merkkijonot.

**Syntaksi:**
```iris
(str.concat `(i64.add (local.get $t0) (i64.const ${(i64.to_string (+ 8 i))}))`)
```

**Edut:**
- Ei tarvitse escapettaa lainausmerkkejä
- Mahdollistaa interpolointia
- Moderni ratkaisu (JavaScript, TypeScript)

**Haitat:**
- Vaikein toteuttaa
- Vaatii syntaksin muutoksen
- Ei yhteensopiva olemassa olevan koodin kanssa

**Toteutus:**
1. Lisätä `TemplateLiteral` token-tyyppi
2. Toteuttaa interpolointi-logiikka
3. Päivittää parseri ja evaluaattori

**Aikataulu:** 8-12 tuntia

---

### Vaihtoehto 4: Heredoc-syntaksi
**Kuvaus:** Lisätä heredoc-tyyppinen syntaksi monirivisille merkkijonoille.

**Syntaksi:**
```iris
(str.concat <<WASM
(i64.add (local.get $t0) (i64.const 
WASM
 (str.concat (i64.to_string (+ 8 i)) <<WASM
)))
WASM
)
```

**Edut:**
- Ei tarvitse escapettaa lainausmerkkejä
- Hyvä monirivisille merkkijonoille
- Yleinen ratkaisu (Bash, Perl, Ruby)

**Haitat:**
- Vaikea toteuttaa
- Vaatii syntaksin muutoksen
- Ei yhteensopiva olemassa olevan koodin kanssa

**Aikataulu:** 6-8 tuntia

---

### Vaihtoehto 5: Hybrid-ratkaisu (Raw Strings + Escape-parannus)
**Kuvaus:** Toteutetaan sekä raw strings että parannetaan escape-käsittelyä.

**Edut:**
- Joustava ratkaisu
- Käyttäjät voivat valita parhaan tavan
- Yhteensopiva olemassa olevan koodin kanssa (escape toimii)

**Haitat:**
- Vaatii enemmän työtä
- Kaksi eri tapaa tehdä sama asia

**Aikataulu:** 5-7 tuntia

---

## Suositus

**Suosittelen Vaihtoehtoa 2 (Raw Strings - Jaettu Ratkaisu)** seuraavista syistä:

1. **Jaettu ratkaisu:** Toimii kaikissa konteksteissa (merkkijonot, tunnisteet, jne.)
2. **Kontrollimerkit:** Käsittelee kontrollimerkit luonnollisesti ilman escape-merkintöjä
3. **Yksinkertainen ja yleinen ratkaisu:** Kolmoislainausmerkit ovat yleinen ratkaisu tähän ongelmaan
4. **Luettavuus:** Koodi on paljon luettavampaa ilman escape-merkintöjä
5. **Toteutettavuus:** Kohtuullisen helppo toteuttaa
6. **Tulevaisuus:** Hyödyllinen myös muihin tarkoituksiin (esim. SQL-kyselyt, JSON)
7. **wat2wasm validointi:** Automaattinen verifiointi varmistaa generoidun WASP:n validiteetin

**Vaihtoehto 1 (Escape-parannus)** on hyvä lyhytaikainen ratkaisu, jos tarvitaan nopea korjaus.

## Toteutussuunnitelma (Vaihtoehto 2: Raw Strings - Jaettu Ratkaisu)

### Vaihe 1: Tokenizer-päivitys
1. Lisätä `RawStr` token-tyyppi `sexp.ts`:ään
2. Tunnistaa `"""` alku- ja loppumerkit
3. Käsitellä raw string -sisältö:
   - **Ei escape-käsittelyä** (kaikki merkit kirjaimellisina)
   - **Kontrollimerkit käsitellään luonnollisesti** (newline, tab, jne.)
   - Sallia moniriviset raw stringit
4. Tunnistaa raw string myös tunnisteiden kontekstissa (tulevaisuudessa)

### Vaihe 2: Parser-päivitys
1. Päivittää `parseExpr()` tunnistamaan raw string -tokenit
2. Palauttaa `Literal` arvo `Str`-tyypillä (raw stringit ovat merkkijonoja runtime:ssa)
3. Varmistaa, että raw stringit toimivat kaikissa konteksteissa:
   - Merkkijonoliteraalit
   - Funktioargumentit
   - Let-bindings
   - Match-caset

### Vaihe 3: AST-päivitys
1. Varmistaa, että `Literal` voi sisältää raw string -arvon
2. Raw stringit evaluoituvat `Str`-tyyppisiksi arvoiksi
3. Ei tarvita erillistä `RawStr`-tyyppiä runtime:ssa (vain parsing-tasolla)

### Vaihe 4: Evaluator-päivitys
1. Varmistaa, että raw stringit evaluoituvat oikein
2. Kontrollimerkit säilyvät kirjaimellisina
3. Testata kaikki tapaukset:
   - WASP-teksti raw stringeissa
   - Kontrollimerkit (newline, tab, carriage return)
   - Erikoismerkit
   - Moniriviset raw stringit

### Vaihe 5: Tunnisteiden tuki (tulevaisuudessa)
1. Sallia raw stringit tunnisteiden nimissä
2. Päivittää parseri tunnistamaan raw stringit tunnisteiden kontekstissa
3. Testata tunnisteet erikoismerkeillä

### Vaihe 6: Testaus ja dokumentaatio
1. Lisätä testit raw stringeille:
   - WASP-teksti
   - Kontrollimerkit
   - Moniriviset stringit
   - Erikoismerkit
2. Päivittää dokumentaatio
3. Päivittää esimerkit käyttämään raw stringeja

### Vaihe 7: wat2wasm automaattinen verifiointi
1. Integroida wat2wasm osaksi testiprosessia
2. Varmistaa, että generoitu WASP on validia
3. Lisätä CI/CD integraatio
4. Automaattinen validointi kaikille WASP-generoiville testeille

## Testitapaukset

### Perustestit
```iris
; Testi 1: Yksinkertainen raw string
(let (s """hello "world" """)
  s)

; Testi 2: Raw string WASP-tekstillä
(let (wasm """(i64.add (local.get $t0) (i64.const 42))""")
  wasm)

; Testi 3: Raw string tavallisella merkkijonolla
(let (s1 "normal")
  (let (s2 """raw""")
    (str.concat s1 s2)))
```

### Kontrollimerkit
```iris
; Testi 4: Newline (ei escapeta)
(let (s """line1
line2""")
  s)  ; Pitäisi sisältää todellisen newline-merkin

; Testi 5: Tab (ei escapeta)
(let (s """col1	col2""")
  s)  ; Pitäisi sisältää todellisen tab-merkin

; Testi 6: Carriage return
(let (s """line1\rline2""")
  s)  ; Pitäisi sisältää \r kirjaimellisena

; Testi 7: Monirivinen raw string
(let (wasm """(module
  (func $add (param $a i64) (param $b i64) (result i64)
    (i64.add (local.get $a) (local.get $b))
  )
)""")
  wasm)
```

### WASP-teksti ja wat2wasm validointi
```iris
; Testi 8: WASP-teksti raw stringeissa (automaattinen wat2wasm validointi)
(deffn (name generate_wasm)
  (args)
  (ret Str)
  (eff !Pure)
  (body
    (let (wasm """(module
      (func $main (result i64)
        (i64.const 42)
      )
      (export "main" (func $main))
    )""")
      wasm)))

; Tämä testi varmistaa wat2wasm:lla että generoitu WASP on validia
```

### Erikoismerkit
```iris
; Testi 9: Erikoismerkit raw stringeissa
(let (s """special: !@#$%^&*()_+-=[]{}|;:'<>,.?/~`""")
  s)

; Testi 10: Unicode-merkkejä
(let (s """Hello 世界 🌍""")
  s)
```

## Yhteensopivuus

- **Olemassa oleva koodi:** Jatkaa toimimaan (tavalliset merkkijonot `"..."` toimivat edelleen)
- **Uusi koodi:** Voi käyttää raw stringeja `"""..."""` kun tarvitsee

## wat2wasm Automaattinen Verifiointi

### Nykyinen tilanne
- wat2wasm käytetään jo joissain testeissä (t141, t142, t143, jne.)
- Validointi ei ole osa automaattista testiprosessia
- Ei CI/CD integraatiota

### Toteutussuunnitelma

#### 1. wat2wasm Helper-funktio
```typescript
// src/test-helpers.ts
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync, readFileSync } from 'fs';
import * as path from 'path';

export function validateWatWithWat2Wasm(watSource: string, testName: string): boolean {
  const tempDir = path.join(__dirname, '../tests/temp');
  const watPath = path.join(tempDir, `${testName}.wat`);
  const wasmPath = path.join(tempDir, `${testName}.wasm`);
  
  try {
    // Kirjoita WASP-tiedosto
    writeFileSync(watPath, watSource, 'utf8');
    
    // Validoi wat2wasm:lla
    execSync(`wat2wasm ${watPath} -o ${wasmPath}`, { stdio: 'pipe' });
    
    // Varmista että WASM-tiedosto luotiin
    const wasm = readFileSync(wasmPath);
    if (wasm.length === 0) {
      throw new Error('wat2wasm produced empty WASM file');
    }
    
    // Siivoa
    unlinkSync(watPath);
    unlinkSync(wasmPath);
    
    return true;
  } catch (error) {
    // Siivoa virheen sattuessa
    try { unlinkSync(watPath); } catch {}
    try { unlinkSync(wasmPath); } catch {}
    throw new Error(`wat2wasm validation failed: ${error}`);
  }
}
```

#### 2. Testien päivitys
- Päivittää kaikki WASP-generoivat testit käyttämään `validateWatWithWat2Wasm`
- Lisätä automaattinen validointi `codegen_wasm_expr.iris` ja `codegen_wasm.iris` testeihin
- Varmistaa, että kaikki generoidut WASP-tiedostot ovat validia

#### 3. CI/CD Integraatio
```yaml
# .github/workflows/test.yml (tulevaisuudessa)
- name: Install wat2wasm
  run: |
    wget https://github.com/WebAssembly/wabt/releases/download/1.0.39/wabt-1.0.39-ubuntu.tar.gz
    tar -xzf wabt-1.0.39-ubuntu.tar.gz
    export PATH=$PATH:$(pwd)/wabt-1.0.39/bin

- name: Run tests with wat2wasm validation
  run: npm test
```

#### 4. package.json Scripts
```json
{
  "scripts": {
    "test:wasm": "npm test -- --grep 'wasm'",
    "test:wasm:validate": "npm test -- --grep 'wasm' && npm run validate:wasm",
    "validate:wasm": "node scripts/validate_all_wasm.js"
  }
}
```

#### 5. Automaattinen Validointi Script
```typescript
// scripts/validate_all_wasm.ts
// Skannaa kaikki .iris tiedostot ja validoi generoidut WASP-tiedostot
```

## Seuraavat askeleet

1. **Toteutus:** Toteutetaan raw strings (Vaihtoehto 2)
2. **Kontrollimerkit:** Varmistetaan kontrollimerkkien käsittely
3. **Tunnisteet:** Toteutetaan raw string -tuki tunnisteille (tulevaisuudessa)
4. **wat2wasm:** Integroida wat2wasm osaksi automaattista verifiointia
5. **Testaus:** Testataan kaikki tapaukset
6. **Dokumentaatio:** Päivitetään dokumentaatio
7. **Esimerkit:** Päivitetään esimerkit käyttämään raw stringeja
8. **CI/CD:** Lisätä wat2wasm validointi CI/CD pipelineen

