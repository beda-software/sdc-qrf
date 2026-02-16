## 1.0.0-beta.26

- Add support for enableFiltering extension
- Add support for enableSort extension
- Add support for defaultSort extension

## 1.0.0-beta.25

- Add support for enableChart extension

## 1.0.0-beta.24

- Clean up non-enumerable props in calculated expressions

## 1.0.0-beta.23

- Add itemPopulationContext converter

## 1.0.0-beta.22

- Add assembleContext converter

## 1.0.0-beta.21

- Add answerOptionsToggleExpression converter

## 1.0.0-beta.20

- Add minOccurs/maxOccurs converter #31

## 1.0.0-beta.19

- Preserve unknown extensions (including primitive) #6 #8
- Fix bug with mixed FCE and extensions #29
- Refactor and speed up FHIR to FCE converter

## 1.0.0-beta.18

- Handle mimeType QuestionnaireItem extension by @dmitryashutov in #26

## 1.0.0-beta.17

- Fix value for preferredTerminologyServer

## 1.0.0-beta.16

- Add subQuestionnaire item extension

## 1.0.0-beta.15

- Add colsNumber item extension

## 1.0.0-beta.13

- Fix critical bug with undefined answers

## 1.0.0-beta.11

- Add strict type for toAnswerValue

## 1.0.0-beta.10

- Handle internal item key

## 1.0.0-beta.9

- Export findAnswerForQuestion

## 1.0.0-beta.8

- Update FormItems type to consider edge cases with missing answer items

## 1.0.0-beta.7

- Export additional utils

## 1.0.0-beta.4

- Clean up empty questionnaire response items

## 1.0.0-beta.3

- Clean up empty answers key from questionnaire response item

## 1.0.0-beta.2

- Add support for variable extension in converter

## 1.0.0-beta.1

- Drop support for Aidbox format, only FCE format is used for Questionnaire
- Drop support for customWidgets
- Drop support for QR converter
- Cover utils with unit tests
- Fix bug with subquestions of answers

## 0.3.24

- Add support for variable extension in converter

## 0.3.23

- Add support for another Questionnaire profile

## 0.3.22

- Added uuidv4 \_itemKey to form items to use it as unique keys

## 0.3.18

- Added assembledFrom extension parsing for questionnaire converters

## 0.3.17

- The package is released as a separate package with own repository
