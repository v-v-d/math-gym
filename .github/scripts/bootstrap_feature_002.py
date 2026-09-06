from pathlib import Path
import json
import subprocess

PIPELINE = Path('.feature-pipeline/scripts/pipeline.py')
FEATURE_DIR = Path('.ai-sdlc/features/FEATURE-002-timed-training-mode')

BUSINESS = '''# Business request

- Feature ID: FEATURE-002
- Title: Режим тренировки на время
- Author: User / product stakeholder
- Date: 2026-09-06

## Business problem

Текущий математический тренажер позволяет решить 10 примеров без ограничения по времени. Нужен дополнительный режим, который тренирует скорость решения и завершает занятие по истечении фиксированного времени.

## Desired outcome

Пользователь может запустить тренировку на время, получить 10 примеров и максимум 60 секунд на их решение. Во время занятия виден таймер. Занятие автоматически завершается по истечении 60 секунд либо раньше, если решены все 10 примеров, после чего показывается результат.

## Users and stakeholders

- Школьник, использующий математический тренажер.
- Родитель/учитель как заинтересованный наблюдатель результата.

## Business constraints

- В тренировке остается ровно 10 примеров.
- Лимит времени — ровно 60 секунд.
- Существующий обычный режим не должен быть сломан.

## Existing evidence or references

- Существующая реализация FEATURE-001 в репозитории math-gym.
- Пользовательское бизнес-описание: «Добавить режим тренировки на время: 10 примеров за 60 секунд, таймер, авто-завершение и отображение результата.»

## Explicit non-goals

- Настраиваемая длительность таймера.
- Адаптивная сложность.
- Пауза или продолжение сессии после перезагрузки страницы.
- Рейтинг, история результатов или аккаунты пользователей.

## Assumptions

- Режим на время добавляется как дополнительный режим и не заменяет существующую тренировку без таймера.
- Если время закончилось до отправки текущего ответа, незавершенный ответ не засчитывается.

## Open questions

- Подтвердить, что режим на время должен сосуществовать с обычным режимом.
- Подтвердить семантику результата при таймауте: учитываются только ответы, отправленные до дедлайна; оставшиеся задания считаются нерешенными в результате X из 10.
'''

business = Path('/tmp/feature-002-business-request.md')
business.write_text(BUSINESS, encoding='utf-8')
subprocess.run(['python3', str(PIPELINE), 'init', '--repo', '.', '--feature-id', 'FEATURE-002', '--title', 'Timed training mode', '--business-request', str(business)], check=True)
state = json.loads((FEATURE_DIR / 'state.json').read_text(encoding='utf-8'))
business_sha = state['business_request']['sha256']

REQUIREMENTS = f'''# Functional specification

- Feature ID: FEATURE-002
- Revision: 1
- Input business-request revision: 1 / SHA-256: {business_sha}
- Author role: Product agent

## Goal

Добавить в существующий математический тренажер отдельный режим «На время», в котором пользователь решает до 10 примеров за фиксированные 60 секунд, постоянно видит оставшееся время, а сессия автоматически завершается по дедлайну или после отправки десятого ответа. После завершения показывается результат из 10.

## Non-goals

- Изменение правил генерации или пулов примеров FEATURE-001.
- Настройка длительности тренировки пользователем.
- Пауза, продление времени или восстановление сессии после reload.
- Новая система сложности, уровни, подсказки или показ правильности после каждого ответа.
- Хранение истории результатов, профили, рейтинги или backend.
- Изменение существующего обычного режима, кроме добавления выбора режима.

## Actors and permissions

- **Школьник** — единственный активный пользователь интерфейса; может выбрать класс, выбрать режим, начать тренировку, вводить/отправлять ответы и увидеть результат.
- **Родитель/учитель** — отдельной роли или прав в приложении нет; может только визуально наблюдать результат на экране.
- Аутентификация и разрешения отсутствуют; FEATURE-002 не добавляет их.

## Glossary

- **Обычный режим** — существующая тренировка FEATURE-001 без ограничения общего времени.
- **Режим «На время»** — новая тренировка с жестким дедлайном 60 секунд.
- **Дедлайн** — момент `start + 60 секунд` для конкретной timed-сессии.
- **Отправленный ответ** — ответ, который пользователь подтвердил действием «Готово» до дедлайна и который был принят приложением.
- **Нерешенное задание** — задание, для которого до завершения timed-сессии нет принятого отправленного ответа.

## User scenarios

### Main scenarios

**SCENARIO-001 — Завершение всех 10 заданий до дедлайна**
1. Пользователь выбирает класс.
2. Пользователь выбирает режим «На время».
3. Пользователь запускает тренировку.
4. Приложение формирует 10 уникальных примеров по правилам FEATURE-001 и начинает 60-секундный отсчет.
5. На экране задания отображается оставшееся время.
6. Пользователь последовательно отправляет ответы.
7. После принятия десятого ответа сессия немедленно завершается, даже если время еще осталось.
8. Приложение показывает результат `X из 10`.

**SCENARIO-002 — Автозавершение по истечении 60 секунд**
1. Пользователь запускает режим «На время».
2. До дедлайна пользователь успевает отправить меньше 10 ответов.
3. При достижении дедлайна приложение автоматически завершает сессию без дополнительного действия пользователя.
4. Текущий введенный, но не отправленный ответ не принимается.
5. Приложение показывает результат по числу правильных отправленных ответов из общего количества 10 заданий и сообщает, что время истекло.

### Alternative and negative scenarios

**SCENARIO-003 — Попытка отправить ответ на границе дедлайна**
- Если на момент обработки действия «Готово» дедлайн уже достигнут или превышен, ответ не принимается, сессия завершается по таймауту.

**SCENARIO-004 — Перезагрузка страницы**
- Reload сбрасывает timed-сессию так же, как текущую обычную сессию; восстановление и продолжение таймера не выполняется.

**SCENARIO-005 — Ошибка старта сессии**
- Если существующая логика создания сессии не может сформировать 10 заданий/идентификатор/время старта, timed-сессия не стартует и используется существующая обработка ошибки старта.

**SCENARIO-006 — Фоновая вкладка или задержка рендера**
- Визуальное обновление таймера может задержаться из-за планировщика браузера, но фактический дедлайн не переносится. После следующей возможности выполнения приложение обязано определить, что 60 секунд уже истекли, и завершить сессию.

## Business rules

- **BR-001.** Режим «На время» является дополнительным; обычный режим FEATURE-001 сохраняется.
- **BR-002.** Timed-сессия содержит ровно 10 уникальных примеров, выбираемых из тех же пулов и по тем же правилам класса, что и FEATURE-001.
- **BR-003.** Длительность timed-сессии фиксирована и равна 60 000 мс; пользователь не может ее менять.
- **BR-004.** Отсчет начинается после успешного создания сессии в момент перехода на первый экран задания.
- **BR-005.** Сессия завершается по первому из двух событий: принят десятый ответ или достигнут дедлайн.
- **BR-006.** После достижения дедлайна новые ответы не принимаются.
- **BR-007.** Введенный, но не отправленный к дедлайну ответ не влияет на результат.
- **BR-008.** Результат — число правильных принятых ответов из 10; нерешенные задания фактически дают 0 правильных и не уменьшают знаменатель.
- **BR-009.** В timed-режиме не показывается правильность после каждого ответа, как и в FEATURE-001.
- **BR-010.** Reload полностью сбрасывает timed-сессию.

## Validation and errors

- Нельзя запустить тренировку, пока не выбран класс и режим.
- Для timed-режима сохраняются текущие правила ввода ответа: цифры 0–9, удаление, максимум 3 цифры, «Готово» недоступно при пустом ответе.
- Действие отправки после дедлайна должно быть отвергнуто независимо от визуального значения таймера в момент клика.
- Ошибка создания timed-сессии не должна запускать таймер и должна показывать существующее сообщение ошибки старта.
- Повторные timer callbacks или повторные пользовательские действия после завершения не должны приводить к повторному завершению, изменению score или повторному принятию ответа.

## Functional requirements

### FR-001 Выбор режима тренировки
- Description: На экране до старта пользователь может выбрать обычный режим или режим «На время». Выбор режима должен быть явным и доступным вместе с выбором класса.
- Rationale: Пользователь должен сознательно выбирать тренировку с ограничением времени, не теряя существующий сценарий.
- Priority: Must.
- Dependencies: FEATURE-001 выбор класса и старт сессии.

### FR-002 Timed-сессия из 10 заданий
- Description: При старте режима «На время» приложение формирует ровно 10 уникальных заданий по правилам выбранного класса из существующего каталога FEATURE-001.
- Rationale: Сохранить сопоставимость результата и текущую предметную модель.
- Priority: Must.
- Dependencies: FR-001, существующий каталог и sampling.

### FR-003 60-секундный дедлайн
- Description: Timed-сессия имеет фиксированный дедлайн через 60 секунд после успешного старта. Дедлайн определяется реальным прошедшим временем, а не количеством визуальных тиков таймера.
- Rationale: Фоновая вкладка и browser throttling не должны давать пользователю дополнительное время.
- Priority: Must.
- Dependencies: FR-002.

### FR-004 Отображение таймера
- Description: Во время timed-сессии пользователь постоянно видит оставшееся время в понятном формате. До старта первого задания отображается полная минута; значение не должно становиться отрицательным.
- Rationale: Пользователь должен понимать оставшийся бюджет времени.
- Priority: Must.
- Dependencies: FR-003.

### FR-005 Ручное завершение десятым ответом
- Description: Если десятый ответ принят до дедлайна, timed-сессия завершается немедленно и показывает результат без ожидания окончания 60 секунд.
- Rationale: Пользователь, завершивший все задания, не должен ждать.
- Priority: Must.
- Dependencies: FR-002, FR-003.

### FR-006 Автозавершение по таймауту
- Description: Если дедлайн наступил до принятия десятого ответа, сессия автоматически и ровно один раз переходит к результату. Никакого дополнительного подтверждения не требуется.
- Rationale: Ключевое бизнес-требование timed-режима.
- Priority: Must.
- Dependencies: FR-003.

### FR-007 Семантика ответа на дедлайне
- Description: Ответ принимается только если обработка submit происходит до дедлайна. Введенный, но не отправленный ответ и submit, обработанный на/после дедлайна, не учитываются.
- Rationale: Устранить race между таймером и кнопкой «Готово».
- Priority: Must.
- Dependencies: FR-003, FR-006.

### FR-008 Результат timed-сессии
- Description: После завершения приложение показывает `X из 10`, где X — число правильных принятых ответов. При таймауте экран дополнительно сообщает, что время истекло. При завершении десятым ответом используется обычная семантика результата FEATURE-001.
- Rationale: Результат должен быть понятен и сопоставим с обычной тренировкой.
- Priority: Must.
- Dependencies: FR-005, FR-006, FR-007.

### FR-009 Повтор и возврат после результата
- Description: После timed-результата пользователь может повторить тренировку с тем же классом и timed-режимом либо вернуться к выбору класса/режима. Повтор запускает новую независимую 60-секундную сессию.
- Rationale: Сохранить существующие post-result действия FEATURE-001.
- Priority: Must.
- Dependencies: FR-008.

### FR-010 Совместимость обычного режима
- Description: В обычном режиме таймер не показывается, дедлайн не применяется, а существующее поведение FEATURE-001 остается функционально неизменным.
- Rationale: FEATURE-002 не должна регрессировать основной режим.
- Priority: Must.
- Dependencies: FR-001.

### FR-011 Доступность таймера
- Description: Оставшееся время доступно визуально и программно для assistive technologies, но частые обновления не должны создавать непрерывный навязчивый поток live-announcements. Критическое событие «Время вышло» должно быть объявлено при автозавершении.
- Rationale: Сохранить доступность существующего приложения.
- Priority: Must.
- Dependencies: FR-004, FR-006.

### FR-012 Analytics / telemetry timed-режима
- Description: Существующая телеметрия должна позволять отличить timed-сессию от обычной и различить завершение `completed_all` и `timeout`, не отправляя выражения, введенные ответы или другие данные, запрещенные политикой FEATURE-001.
- Rationale: Измерять использование и завершение нового режима без расширения чувствительного payload.
- Priority: Should.
- Dependencies: FR-001, FR-005, FR-006, существующая analytics policy.

## Acceptance criteria

- **AC-001 / FR-001, FR-010:** Given пользователь на стартовом экране, when он выбирает обычный режим и начинает занятие, then тренировка работает без таймера и без 60-секундного автозавершения.
- **AC-002 / FR-001, FR-002:** Given выбран класс и режим «На время», when пользователь начинает занятие, then создано ровно 10 уникальных задач из корректного пула выбранного класса.
- **AC-003 / FR-003, FR-004:** Given timed-сессия успешно стартовала, when открыто первое задание, then таймер показывает полную минуту и далее отражает неувеличивающееся оставшееся время до нуля.
- **AC-004 / FR-005:** Given пользователь отправил 9 ответов и дедлайн еще не наступил, when до дедлайна принят десятый ответ, then результат показывается немедленно и timeout больше не может изменить состояние/score.
- **AC-005 / FR-006, FR-008:** Given прошло 60 секунд и принято меньше 10 ответов, when приложение получает возможность выполнить обработку дедлайна, then сессия автоматически завершается ровно один раз и показывает `X из 10` плюс сообщение об истекшем времени.
- **AC-006 / FR-007:** Given в поле визуально набран ответ, but он не был принят до дедлайна, when наступает дедлайн, then этот ответ не включается в score и не появляется как отправленный response.
- **AC-007 / FR-007:** Given submit обрабатывается при elapsed >= 60 000 мс, when пользователь нажал «Готово», then submit не принимается и результат определяется состоянием на дедлайн.
- **AC-008 / FR-008:** Given к таймауту приняты 6 ответов, из них 4 правильных, when показывается результат, then отображается `4 из 10`, а не `4 из 6`.
- **AC-009 / FR-009:** Given timed-сессия завершена, when пользователь выбирает «Еще раз», then создается новая timed-сессия на 10 задач с новым 60-секундным отсчетом.
- **AC-010 / FR-010:** Existing unit/regression checks ordinary mode must continue to pass; timed logic must not activate for ordinary sessions.
- **AC-011 / FR-011:** Timer value is available to assistive technology without an announcement every second; timeout completion announces the final state/event.
- **AC-012 / FR-012:** Analytics events for timed sessions contain mode and completion reason only in the approved allowlist; answer/expression values are absent.
- **AC-013 / reliability:** Multiple timeout callbacks or user actions after completion do not produce duplicate session completion transitions or duplicate accepted answers.

## Analytics / telemetry expectations

- Сохранить существующие цели `session_started`, `answer_submitted`, `session_completed`, `session_start_failed` если архитектурный этап не выявит необходимости новой цели.
- Добавить в разрешенный payload признак режима (`standard`/`timed`) для session-level событий.
- Для `session_completed` добавить причину завершения (`completed_all`/`timeout`).
- Не отправлять математическое выражение, введенный ответ, конкретную задачу или иные новые пользовательские данные.
- Изменение allowlist и production analytics policy должно оставаться fail-closed по существующей архитектуре.

## Non-functional expectations

- Дедлайн не должен зависеть от точности `setInterval`; решение о допустимости submit и завершении должно опираться на фактически прошедшее время.
- UI не должен показывать отрицательное время или возвращать таймер назад/вверх.
- Сессия должна завершаться идемпотентно: максимум один финальный transition и один итоговый score.
- Фоновое throttling браузера не продлевает 60-секундный лимит.
- FEATURE-002 должна работать в поддерживаемых текущим приложением браузерах и не добавлять backend/runtime dependency.

## Assumptions

- **ASSUMPTION-001:** «Добавить режим» означает добавить второй режим рядом с существующим, а не заменить текущий сценарий.
- **ASSUMPTION-002:** При таймауте знаменатель результата остается 10; незавершенные задания считаются нерешенными, а не исключаются из результата.
- **ASSUMPTION-003:** Частично введенный ответ в момент таймаута не отправляется автоматически.
- **ASSUMPTION-004:** 60 секунд отсчитываются с момента успешного перехода к первому заданию, а не с момента выбора режима/класса.

## Open questions

- **Q-001:** Подтвердить ASSUMPTION-001: timed-режим должен сосуществовать с обычным режимом.
- **Q-002:** Подтвердить ASSUMPTION-002 и ASSUMPTION-003: при таймауте учитываются только ответы, принятые до дедлайна; результат остается `X из 10`, незавершенный текущий ответ не засчитывается.
- **Q-003:** Подтвердить ASSUMPTION-004: отсчет начинается при успешном старте первого задания.
'''
requirements = Path('/tmp/feature-002-functional-spec.md')
requirements.write_text(REQUIREMENTS, encoding='utf-8')
subprocess.run(['python3', str(PIPELINE), 'submit', '--feature-dir', str(FEATURE_DIR), '--stage', 'requirements', '--source', str(requirements)], check=True)
state = json.loads((FEATURE_DIR / 'state.json').read_text(encoding='utf-8'))
current = state['artifacts']['requirements']['current']

REVIEW = f'''# Independent AI review

- Feature ID: FEATURE-002
- Artifact / item: requirements
- Reviewed revision/hash: {current['revision']} / SHA-256: {current['sha256']}
- Reviewer role: Requirements reviewer
- Verdict: approved

## Findings

No blocking or high findings.

### FINDING-001 Explicit assumption set requires product confirmation
- Severity: low
- Location / stable ID: ASSUMPTION-001..004, Q-001..Q-003
- Evidence: The business request specifies «10 примеров за 60 секунд, таймер, авто-завершение и отображение результата» but does not explicitly define coexistence with the existing mode, timeout scoring for an unsubmitted answer, or the exact timer start instant. The specification makes these choices explicit instead of silently hiding uncertainty.
- Required change: No producer change required before human gate. Human approval of this exact revision confirms these assumptions; otherwise request changes with the desired semantics.
- Affected upstream/downstream IDs: FR-001, FR-003, FR-006, FR-007, FR-008, FR-010; future UX/architecture/test-plan artifacts.

## Review summary

- Business-request fidelity: covered; all four explicit capabilities (10 examples, 60 seconds, visible timer, auto-finish/result) are mapped to requirements.
- Existing-product compatibility: explicitly preserves FEATURE-001 ordinary mode and current problem pools/input behavior.
- Main/alternate/negative flows: includes early completion, timeout, deadline race, reload, start failure, background throttling, repeated callbacks.
- Acceptance criteria: observable and linked to requirement IDs.
- Telemetry/privacy: extends only allowlisted metadata and explicitly excludes expressions/answers.
- Uncertainty: material interpretation choices are isolated as assumptions/questions for the human gate rather than presented as source facts.

## Open questions

- Q-001: Approving the revision confirms that timed mode is additional and does not replace ordinary mode.
- Q-002: Approving confirms that only accepted pre-deadline answers count and score remains X/10; a partially typed answer is discarded at timeout.
- Q-003: Approving confirms that the 60-second countdown starts when the first timed task becomes active after successful session creation.
'''
review = Path('/tmp/feature-002-requirements-review.md')
review.write_text(REVIEW, encoding='utf-8')
subprocess.run(['python3', str(PIPELINE), 'decide', '--feature-dir', str(FEATURE_DIR), '--stage', 'requirements', '--kind', 'ai', '--verdict', 'approved', '--feedback-file', str(review)], check=True)
subprocess.run(['python3', str(PIPELINE), 'status', '--feature-dir', str(FEATURE_DIR)], check=True)
