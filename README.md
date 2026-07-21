# sdc-qrf

Set of utils packaged in [npm package](https://www.npmjs.com/package/sdc-qrf) to render forms for SDC Questionnaire/Questionnaire Response.

Sdc-qrf uses in [fhir-emr](https://github.com/beda-software/fhir-emr) project. Also we're using [aidbox-sdc](https://github.com/beda-software/aidbox-sdc) as backed for fhir-emr.

```sh
npm i sdc-qrf
```

P.S. the package was allocated from https://github.com/beda-software/sdc-ide with commits history

## Translation

The FHIR ↔ FCE converter supports the [`translation`](http://hl7.org/fhir/StructureDefinition/translation) primitive extension on fields such as `Questionnaire.title` and `Questionnaire.item.text`.

**FHIR**

```yaml
item:
    - linkId: chief-complaint
      type: string
      text: Chief complaint
      _text:
          extension:
              - url: http://hl7.org/fhir/StructureDefinition/translation
                extension:
                    - url: lang
                      valueCode: de
                    - url: content
                      valueString: Hauptbeschwerde
              - url: http://hl7.org/fhir/StructureDefinition/translation
                extension:
                    - url: lang
                      valueCode: fr
                    - url: content
                      valueString: Motif de consultation
```

**FCE** (`toFirstClassExtension` / `fromFirstClassExtension`)

```yaml
item:
    - linkId: chief-complaint
      type: string
      text: Chief complaint
      _text:
          translation:
              - lang: de
                content: Hauptbeschwerde
              - lang: fr
                content: Motif de consultation
```

### `translateQuestionnaire`

To bake a single language into a FHIR Questionnaire before converting to FCE (resolves matching translations, keeps translation extensions, and stashes the original value):

```ts
import { toFirstClassExtension, translateQuestionnaire } from 'sdc-qrf';

const fceQuestionnaire = toFirstClassExtension(translateQuestionnaire(questionnaire, 'fr'));
```

`translateQuestionnaire(questionnaire, 'fr')` produces:

```yaml
language: fr
item:
    - linkId: chief-complaint
      type: string
      text: Motif de consultation
      _text:
          extension:
              - url: http://hl7.org/fhir/StructureDefinition/translation
                extension:
                    - url: lang
                      valueCode: de
                    - url: content
                      valueString: Hauptbeschwerde
              - url: http://hl7.org/fhir/StructureDefinition/translation
                extension:
                    - url: lang
                      valueCode: fr
                    - url: content
                      valueString: Motif de consultation
              - url: http://hl7.org/fhir/StructureDefinition/translation
                extension:
                    - url: lang
                      valueCode: en
                    - url: content
                      valueString: Chief complaint
```

Before replacing a value, the original is stored as a translation extension using `Questionnaire.language` (or `en` if missing). If at least one translation is applied, `Questionnaire.language` is set to the requested language. If the requested language is missing, the original value and all translation extensions are left unchanged.
