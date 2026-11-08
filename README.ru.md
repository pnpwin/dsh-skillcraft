# DSH Skillcraft

**v0.1.3 — DSH Skillcraft:** пакет, репозиторий, provider и skill — `dsh-skillcraft`. Model tool — `dsh_skillcraft`, изолированные case tools — `dsh_skillcraft_*`. Новые результаты — `.dsh-skillcraft/runs/`; прежние эксперименты сохранены. Меняются имена, не методика и не доказательства качества. [Миграция](docs/release-v0.1.3.md).

Код, build/CLI/bench scripts — только в `src/`. В корне остаются документация, manifests и metadata для DSH. Каталоги `tests/`, `locale/` и ресурсов не переносятся. [Проверки и ограничения качества](docs/validation-v0.1.2.md).

**`dsh-skillcraft`** — создание и проверка навыков в DSH.

Цикл: назначение → черновик → реальное поведение агента без навыка → RED/GREEN/REFACTOR → проверка на новых задачах → улучшение. Падение теста намеренно испорченного кода не заменяет наблюдаемую неудачу baseline-агента.

v0.1.1 убирает историю переноса: основной skill7735→7375символов; полный набор с optional references23235→19412. Это длины текста, не измеренные provider tokens. [Область измерения и проверки](docs/context-cleanup-v0.1.1.md).

## Возможности

- [Основной skill](src/skills/dsh-skillcraft/SKILL.md) с постепенно загружаемыми ресурсами.
- Native tool `dsh_skillcraft`: парные проверки baseline/with_skill через DSH agentLoop и NativeToolExecutor, штатные фоновые jobs, ограниченный общий бюджет, objective checks, фактические/неизвестные токены и время.
- [Offline CLI](src/skills/dsh-skillcraft/scripts/cli.js): проверить spec или заново сформировать Markdown, без LLM.
- [Русские метаданные](locale/ru.json), [английские метаданные](locale/en.json), оригинальная [иконка](src/icon.svg).

Evaluator не исполняет сгенерированный код, не публикует навыки и не изменяет библиотеку или политику dsh-skillgrowth. В dsh-skillgrowth подключён отдельно версионируемый компактный набор правил авторинга.

## Установка

DSH0.2.2-rc.1, Node>=22, без runtime npm dependencies и install/prepare hooks. Устанавливать только через Plugin Manager:

```json
{"action":"install_bundle","target":"github:pnpwin/dsh-skillcraft#v0.1.3","enabled":true}
```

Сначала загрузить `dsh-skillcraft` штатным инструментом skills, затем читать [методику native проверки](src/skills/dsh-skillcraft/references/evaluation.md).

```json
{"action":"validate","specPath":"evals.json"}
{"action":"run","specPath":"evals.json","split":"train","maxCalls":18,"timeoutMs":300000}
```

Это аргументы `dsh_skillcraft`. Validate не вызывает модель. Run — явно платная проверка с native jobId; получить результат через `job_output`, остановить через `job_kill`. Не тратить исходный cap заново на каждой итерации: сумма baseline, candidate, повторов и reviewer должна оставаться в согласованном бюджете. Для итоговой проверки использовать split holdout; не подгонять навык по её результатам.

## Что именно проверяет runner

Case получает одинаковые task/input/model/tool schemas/лимиты в обоих arms и отдельную in-memory карту файлов. Разрешены только scoped read/write/finish и загрузка указанного native skill. Содержимое файлов — текст, **никогда не запускается**. Host после завершения выполняет конечные проверки JSON/text/file-exists; expected не попадают в модель. Это capability-scoped текстовая среда, не общий shell/OS sandbox. Другие задачи требуют отдельно разрешённого доверенного evaluator.

Режим task предварительно загружает exact body через scoped native registry. Режим routing даёт только name/description и отмечает фактическую загрузку через native lookup; проверки skill-loaded true/false. Это контролируемый probe описания, не тест всего боевого каталога поиска. Загрузка ≠ применение ≠ польза.

Настройки: maxLogicalCalls18, timeoutMs300000, maxSteps4, maxOutputTokens1500. Runtime не позволяет превышать настроенные пределы аргументами run. Каждый допущенный модельный dispatch, в том числе неуспешный/служебный в scope case, расходует общий cap. Незавершённые arms, ошибки и неизвестные usage не исчезают из отчёта.

## Как читать результат

Отдельно train/holdout, парные выигрыши/регрессии, время, provider-reported токены и описательная дисперсия при достаточных данных. Если baseline уже справляется или результаты равны — не объявлять качество улучшенным. Unknown — null, не0; символы/байты не пересчитываются в «токены». Отчёт не удостоверяет HTTP-retry/billing totals, общую причинность, применение каждой инструкции или право публикации.

## Разработка и происхождение

```bash
node --test tests/*.test.mjs
node src/check-package.js
node src/check-package.js --pack
```

[Лицензионные уведомления](NOTICE.md). Исторические результаты проверок хранятся отдельно от текущих модельных ресурсов и не являются новым доказательством пользы навыка.
