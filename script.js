const releaseNotes = ['C2', 'D#2', 'F2', 'G2', 'A#2', 'C3', 'D#3', 'F3']
const audioEngine = {
  nodes: null,
  lastTimes: {},
  async start() {
    if (!window.Tone)
      throw new Error('Tone.js не загружен. Проверьте доступ к CDN.')
    await Tone.start()
    if (Tone.context.state !== 'running')
      throw new Error('Браузер не разрешил аудио. Нажмите кнопку питания.')
    if (this.nodes) return
    const filter = new Tone.Filter({
      frequency: 8000,
      type: 'lowpass',
      rolloff: -24,
      Q: 0.8,
    })
    const distortion = new Tone.Distortion({
      distortion: 0.25,
      wet: 0.1,
      oversample: '2x',
    })
    const delay = new Tone.FeedbackDelay({
      delayTime: '8n',
      feedback: 0.2,
      wet: 0.16,
    })
    const master = new Tone.Gain(0)
    filter.chain(distortion, delay, master, Tone.Destination)
    const click = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: {
        attack: 0.001,
        decay: 0.018,
        sustain: 0,
        release: 0.008,
      },
      volume: -20,
    }).connect(filter)
    const release = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sawtooth' },
      envelope: {
        attack: 0.008,
        decay: 0.15,
        sustain: 0.25,
        release: 0.22,
      },
      volume: -16,
    }).connect(filter)
    release.maxPolyphony = 16
    const denied = new Tone.Synth({
      oscillator: { type: 'fatsawtooth', count: 2, spread: 45 },
      envelope: {
        attack: 0.002,
        decay: 0.1,
        sustain: 0.45,
        release: 0.07,
      },
      volume: -18,
    }).connect(filter)
    this.nodes = {
      filter,
      distortion,
      delay,
      master,
      click,
      release,
      denied,
    }
    this.lastTimes = {}
  },
  stop() {
    if (!this.nodes) return
    for (const node of Object.values(this.nodes)) node.dispose()
    this.nodes = null
    this.lastTimes = {}
  },
  eventTime(voice, time) {
    const next = Math.max(
      time ?? Tone.now(),
      (this.lastTimes[voice] ?? -Infinity) + 0.001,
    )
    this.lastTimes[voice] = next
    return next
  },
  playAttempt(time) {
    if (this.nodes)
      this.nodes.click.triggerAttackRelease(
        0.018,
        this.eventTime('click', time),
        0.65,
      )
  },
  playDenied(time) {
    if (!this.nodes) return
    const at = this.eventTime('denied', time),
      synth = this.nodes.denied
    synth.triggerAttackRelease('G2', 0.26, at, 0.75)
    synth.frequency.setValueAtTime(98, at)
    synth.frequency.exponentialRampToValueAtTime(24, at + 0.22)
  },
  playSound(slotId, parameters, time) {
    if (this.nodes)
      this.nodes.release.triggerAttackRelease(
        releaseNotes[slotId],
        '8n',
        this.eventTime('release', time),
        0.7,
      )
  },
  setParameter(name, value) {
    if (name === 'bpm' && window.Tone) Tone.Transport.bpm.rampTo(value, 0.05)
    if (!this.nodes) return
    const { filter, distortion, delay, master } = this.nodes
    if (name === 'master') master.gain.rampTo(value / 100, 0.03)
    if (name === 'cutoff') filter.frequency.rampTo(value, 0.03)
    if (name === 'reverb') {
      const depth = value / 100
      distortion.wet.rampTo(depth * 0.4, 0.03)
      delay.wet.rampTo(depth * 0.65, 0.03)
      delay.feedback.rampTo(depth * 0.6, 0.03)
    }
  },
}
window.audioEngine = audioEngine
const parameters = { master: 75, cutoff: 8000, reverb: 25, bpm: 120 }
const slots = [
  {
    name: 'Выдача суб-баса',
    type: 'SUB BASS',
    meta: '40 Hz · форма № 001',
    wave: 'M1 12Q5 0 9 12T17 12T25 12T33 12',
  },
  {
    name: 'Справка о частоте 440 Гц',
    type: 'SINE',
    meta: '440 Hz · форма № 002',
    wave: 'M1 12Q3 1 5 12T9 12T13 12T17 12T21 12T25 12T29 12T33 12',
  },
  {
    name: 'Регистрация щелчка',
    type: 'CLICK',
    meta: '2 ms · форма № 003',
    wave: 'M1 15h12l2-13 3 20 2-7h13',
  },
  {
    name: 'Оформление бочки',
    type: 'KICK',
    meta: '60 Hz · форма № 004',
    wave: 'M1 12l3-10 3 20 3-17 3 13 3-10 3 7 3-5 3 3 3-1h5',
  },
  {
    name: 'Разрешение на снейр',
    type: 'SNARE',
    meta: '200 Hz · форма № 005',
    wave: 'M1 12h3l2-8 2 16 2-13 2 10 2-14 2 18 2-13 2 9 2-5 2 3h9',
  },
  {
    name: 'Выписка хай-хэта',
    type: 'HI-HAT',
    meta: '8 kHz · форма № 006',
    wave: 'M1 12l2-4 2 8 2-14 2 19 2-12 2 7 2-13 2 16 2-12 2 9 2-6 2 4 2-2h4',
  },
  {
    name: 'Согласование аккорда',
    type: 'CHORD',
    meta: 'C minor · форма № 007',
    wave: 'M1 19V5h5v14h5V5h5v14h5V5h5v14h7',
  },
  {
    name: 'Лицензия на атмосферу',
    type: 'PAD',
    meta: '∞ ms · форма № 008',
    wave: 'M1 12Q5 10 8 7T16 12T24 17T33 12',
  },
].map((slot, id) => ({
  ...slot,
  id,
  stage: 0,
  blockedUntil: 0,
  timer: null,
  approved: false,
}))
const $ = (id) => document.getElementById(id)
let powered = false,
  powerBusy = false,
  running = false,
  currentStep = -1,
  queueEvent = null,
  queueGeneration = 0,
  totalEvents = 0
const steps = [true, false, true, false, true, false, true, false]
function log(message, detail = '', type = 'info') {
  const item = document.createElement('div')
  item.className = 'log-item ' + type
  const meta = document.createElement('div')
  meta.className = 'log-meta'
  const time = document.createElement('span')
  time.textContent = new Date().toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const label = document.createElement('span')
  label.className = 'log-type'
  label.textContent =
    type === 'success' ? 'ОДОБРЕНО' : type === 'error' ? 'ОТКАЗ' : 'СИСТЕМА'
  meta.append(time, label)
  const text = document.createElement('div')
  text.className = 'log-message'
  text.textContent = message
  item.append(meta, text)
  if (detail) {
    const description = document.createElement('div')
    description.className = 'log-detail'
    description.textContent = detail
    item.append(description)
  }
  $('log').prepend(item)
  while ($('log').children.length > 60) $('log').lastElementChild.remove()
  totalEvents++
  $('log-count').textContent = `${$('log').children.length} записей`
  return item
}
function renderSlot(slot) {
  const button = $('slot-' + slot.id)
  const denied = slot.blockedUntil > Date.now()
  button.dataset.stage = slot.stage
  button.classList.toggle('approved', slot.approved)
  button.classList.toggle('denied', denied)
  button.disabled = denied
  const status = denied
    ? 'ОТКАЗ // СБОЙ ПРОТОКОЛА'
    : slot.approved
      ? 'ВЫПУЩЕНО'
      : slot.stage === 2
        ? 'ВЗЛОМ РАЗРЕШЁН (2/3)'
        : slot.stage === 1
          ? 'РАСШИФРОВКА... (1/3)'
          : '[СЕКРЕТНО]'
  button.querySelector('.service-status').textContent = status
  button.setAttribute(
    'aria-label',
    `${slot.name}. ${status}. Клавиша ${slot.id + 1}`,
  )
}
function resetSlot(slot) {
  clearTimeout(slot.timer)
  slot.timer = null
  slot.stage = 0
  slot.approved = false
  slot.blockedUntil = 0
  $('slot-' + slot.id).classList.remove('flash')
  renderSlot(slot)
}
function playSound(slotId, time) {
  if (!powered) return false
  try {
    audioEngine.playSound(slotId, { ...parameters }, time)
    window.dispatchEvent(
      new CustomEvent('gossint:sound', {
        detail: { slotId, parameters: { ...parameters } },
      }),
    )
    return true
  } catch (error) {
    log('Ошибка генерации сигнала', slots[slotId].name, 'error')
    return false
  }
}
window.playSound = playSound
function requestResult(slotId, source, result) {
  window.dispatchEvent(
    new CustomEvent('gossint:request', {
      detail: { slotId, source, ...result },
    }),
  )
  return result
}
function submitSlot(id, source = 'manual', time) {
  const slot = slots[id]
  if (!slot) throw new RangeError('Unknown slot')
  if (!powered) {
    log(
      'Включите питание для подачи заявления',
      'Система генерации сигналов отключена',
    )
    return { status: 'power_off' }
  }
  if (slot.blockedUntil > Date.now()) return { status: 'blocked' }
  clearTimeout(slot.timer)
  slot.timer = null
  if (slot.approved) {
    slot.approved = false
    slot.stage = 0
    $('slot-' + id).classList.remove('flash')
  }
  slot.stage++
  if (slot.stage < 3) {
    audioEngine.playAttempt(time)
    log(
      slot.stage === 1 ? 'Запрос принят' : 'Заявление ожидает подписи',
      slot.name +
        ' · ' +
        slot.stage +
        '/3' +
        (source === 'queue' ? ' · электронная очередь' : ''),
    )
    renderSlot(slot)
    return requestResult(id, source, {
      status: 'pending',
      stage: slot.stage,
    })
  }
  if (Math.random() < 0.15) {
    audioEngine.playDenied(time)
    slot.stage = 0
    slot.blockedUntil = Date.now() + 2000
    log(
      'Отказано: Обед',
      slot.name + ' · повторная подача через 2 секунды',
      'error',
    )
    slot.timer = setTimeout(() => {
      slot.blockedUntil = 0
      renderSlot(slot)
    }, 2000)
    renderSlot(slot)
    return requestResult(id, source, { status: 'denied' })
  }
  slot.approved = true
  renderSlot(slot)
  $('slot-' + id).classList.add('flash')
  playSound(id, time)
  log('Услуга оказана', slot.name + ' · заявление одобрено', 'success')
  return requestResult(id, source, { status: 'approved' })
}
slots.forEach((slot) => {
  const button = document.createElement('button')
  button.id = 'slot-' + slot.id
  button.className = 'service'
  button.type = 'button'
  button.innerHTML = `<div class="service-top"><svg class="signal" viewBox="0 0 34 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${slot.wave}"/></svg><span class="key">${slot.id + 1}</span></div><div class="service-title">${slot.name}</div><div class="service-meta">${slot.type} · ${slot.meta.split(' · ')[0]}</div><span class="service-status">Не подано</span><div class="progress" aria-hidden="true"><i></i><i></i><i></i></div>`
  button.addEventListener('click', () => submitSlot(slot.id))
  $('services').append(button)
  renderSlot(slot)
})
const controlDefinitions = [
  {
    id: 'master',
    label: 'Уровень шума',
    en: 'Master volume',
    min: 0,
    max: 100,
    step: 1,
    ends: ['0%', '100%'],
    format: (v) => v + '%',
  },
  {
    id: 'cutoff',
    label: 'Степень цензуры',
    en: 'Filter cutoff',
    min: 20,
    max: 20000,
    step: 10,
    ends: ['20 Hz', '20 kHz'],
    format: (v) =>
      v >= 1000 ? (v / 1000).toFixed(1).replace('.0', '') + ' kHz' : v + ' Hz',
  },
  {
    id: 'reverb',
    label: 'Реверберация',
    en: 'Reverb mix',
    min: 0,
    max: 100,
    step: 1,
    ends: ['Сухо', 'Просторно'],
    format: (v) => v + '%',
  },
  {
    id: 'bpm',
    label: 'Темп',
    en: 'Tempo / BPM',
    min: 40,
    max: 200,
    step: 1,
    ends: ['40 BPM', '200 BPM'],
    format: (v) => v + ' BPM',
  },
]
controlDefinitions.forEach((control) => {
  const wrapper = document.createElement('div')
  wrapper.innerHTML = `<label class="control-label" for="${control.id}"><span>${control.label}</span><output class="value" id="${control.id}-value" for="${control.id}"></output></label><div class="control-en">${control.en}</div><input type="range" id="${control.id}" min="${control.min}" max="${control.max}" step="${control.step}" value="${parameters[control.id]}"><div class="range-ends"><span>${control.ends[0]}</span><span>${control.ends[1]}</span></div>`
  $('sliders').append(wrapper)
  const update = () => {
    const value = Number($(control.id).value)
    parameters[control.id] = value
    $(control.id + '-value').value = control.format(value)
    $(control.id).style.setProperty(
      '--fill',
      ((value - control.min) / (control.max - control.min)) * 100 + '%',
    )
    $(control.id).setAttribute('aria-valuetext', control.format(value))
    $('bpm-label').textContent = parameters.bpm
  }
  $(control.id).addEventListener('input', () => {
    update()
    try {
      audioEngine.setParameter(control.id, parameters[control.id])
    } catch (error) {
      log('Не удалось применить параметр', control.label, 'error')
    }
  })
  $(control.id).addEventListener('change', () =>
    log(
      'Регламент обновлён',
      control.label + ': ' + control.format(parameters[control.id]),
    ),
  )
  update()
})
steps.forEach((checked, index) => {
  const label = document.createElement('label')
  label.className = 'ticket' + (checked ? ' checked' : '')
  label.id = 'ticket-' + index
  label.innerHTML = `<span class="ticket-code">А-${String(index + 1).padStart(2, '0')}</span><input type="checkbox" ${checked ? 'checked' : ''} aria-label="Активировать шаг ${index + 1}: ${slots[index].name}"><span class="ticket-number">ОКНО ${String(index + 1).padStart(2, '0')}</span>`
  label.querySelector('input').addEventListener('change', (event) => {
    steps[index] = event.target.checked
    label.classList.toggle('checked', steps[index])
  })
  $('tickets').append(label)
})
function renderQueue() {
  steps.forEach((_, index) => {
    $('ticket-' + index).classList.toggle('current', currentStep === index)
    if (currentStep === index)
      $('ticket-' + index).setAttribute('aria-current', 'step')
    else $('ticket-' + index).removeAttribute('aria-current')
  })
  $('transport').setAttribute('aria-pressed', running)
  $('transport')
    .querySelector('use')
    .setAttribute('href', running ? '#i-pause' : '#i-play')
  $('transport').querySelector('span').textContent = running
    ? 'Пауза'
    : 'Запустить'
  $('queue-status').textContent =
    currentStep < 0
      ? 'Ожидание запуска'
      : `${running ? 'Приём талона' : 'Пауза'} А-${String(currentStep + 1).padStart(2, '0')}`
}
function queueTick(time) {
  if (!running || !powered) return
  currentStep = (currentStep + 1) % 8
  const generation = queueGeneration
  Tone.Draw.schedule(() => {
    if (running && generation === queueGeneration) renderQueue()
  }, time)
  if (steps[currentStep]) submitSlot(currentStep, 'queue', time)
}
function stopQueue() {
  running = false
  queueGeneration++
  if (window.Tone) Tone.Transport.pause()
  renderQueue()
}
function resetQueue() {
  stopQueue()
  if (window.Tone) {
    Tone.Transport.stop()
    if (queueEvent !== null) Tone.Transport.clear(queueEvent)
  }
  queueEvent = null
  currentStep = -1
  renderQueue()
}
$('transport').addEventListener('click', () => {
  if (!powered) {
    log('Очередь недоступна', 'Включите питание для запуска')
    return
  }
  if (running) {
    stopQueue()
    log('Электронная очередь приостановлена')
  } else {
    if (queueEvent === null)
      queueEvent = Tone.Transport.scheduleRepeat(queueTick, '8n', 0)
    running = true
    queueGeneration++
    renderQueue()
    log(
      'Электронная очередь запущена',
      parameters.bpm + ' BPM · одно обращение на активный талон',
    )
    Tone.Transport.start()
  }
})
$('reset').addEventListener('click', () => {
  resetQueue()
  log('Позиция электронной очереди сброшена')
})
async function setPower(next) {
  if (powerBusy || next === powered) return
  powerBusy = true
  $('power').disabled = true
  try {
    if (next) {
      await audioEngine.start()
      for (const [name, value] of Object.entries(parameters))
        audioEngine.setParameter(name, value)
    } else {
      resetQueue()
      audioEngine.stop()
      slots.forEach(resetSlot)
    }
    powered = next
    $('power').classList.toggle('on', powered)
    $('power').setAttribute('aria-pressed', powered)
    $('power').querySelector('span').textContent = powered
      ? 'Питание включено'
      : 'Включить питание'
    $('system-status').innerHTML =
      `<i class="small-dot ${powered ? 'live' : ''}"></i> ${powered ? 'Система готова' : 'Питание выключено'}`
    $('log-dot').classList.toggle('live', powered)
    $('log-connection').textContent = powered
      ? 'Система готова к приёму'
      : 'Система в режиме ожидания'
    log(
      powered ? 'Питание включено' : 'Питание выключено',
      powered
        ? 'Окна приёма доступны. Подайте первое заявление.'
        : 'Приём заявлений приостановлен',
    )
  } catch (error) {
    audioEngine.stop()
    log(
      'Не удалось переключить питание',
      error.message || 'Повторите попытку',
      'error',
    )
  } finally {
    powerBusy = false
    $('power').disabled = false
  }
}
$('power').addEventListener('click', () => setPower(!powered))
$('clear').addEventListener('click', () => {
  $('log').replaceChildren()
  $('log-count').textContent = '0 записей'
})
document.addEventListener('keydown', (event) => {
  if (
    event.repeat ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    event.target.closest('input,textarea,select,[contenteditable="true"]')
  )
    return
  if (/^[1-8]$/.test(event.key)) {
    event.preventDefault()
    submitSlot(Number(event.key) - 1)
  }
})
log(
  'Система инициализирована',
  'Все ведомства подключены. Ожидание включения питания.',
)
log(
  'Регламент оказания услуг загружен',
  'Три нажатия для согласования · 8 окон приёма',
)
window.gossint = {
  submitSlot,
  setPower,
  getState: () => ({
    powered,
    running,
    currentStep,
    parameters: { ...parameters },
    steps: [...steps],
    slots: slots.map(({ id, stage, approved, blockedUntil }) => ({
      id,
      stage,
      approved,
      blockedUntil,
    })),
  }),
}
if (document.modelContext?.registerTool) {
  const lifecycle = new AbortController()
  try {
    Promise.resolve(
      document.modelContext.registerTool(
        {
          name: 'submit_signal_request',
          title: 'Подать заявление на сигнал',
          description:
            'Submit one of the three required approvals for a signal service. Power must be enabled. May yield a refusal on the third approval.',
          inputSchema: {
            type: 'object',
            properties: {
              slotId: { type: 'integer', minimum: 0, maximum: 7 },
            },
            required: ['slotId'],
            additionalProperties: false,
          },
          annotations: {
            readOnlyHint: false,
            untrustedContentHint: false,
          },
          execute(input) {
            if (
              !input ||
              !Number.isInteger(input.slotId) ||
              input.slotId < 0 ||
              input.slotId > 7 ||
              Object.keys(input).some((key) => key !== 'slotId')
            )
              throw new TypeError('slotId must be an integer from 0 to 7')
            return submitSlot(input.slotId)
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => {})
  } catch (error) {}
  window.addEventListener('pagehide', () => lifecycle.abort(), {
    once: true,
  })
}
window.addEventListener('pagehide', () => {
  resetQueue()
  audioEngine.stop()
  powered = false
  slots.forEach((slot) => clearTimeout(slot.timer))
})

{
  const cursor = document.getElementById('citizen-cursor')
  const fine = window.matchMedia('(any-hover: hover) and (any-pointer: fine)')
  let active = false,
    hoveredSlot = null,
    stateTimer = null
  function setHover(target) {
    const slot = target instanceof Element ? target.closest('.service') : null
    hoveredSlot = slot ? Number(slot.id.slice(5)) : null
    cursor.classList.toggle(
      'approaching',
      !!slot &&
        !slot.classList.contains('approved') &&
        !slot.classList.contains('denied'),
    )
  }
  function move(event) {
    if (!fine.matches || event.sourceCapabilities?.firesTouchEvents) {
      hide()
      return
    }
    cursor.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`
    active = true
    cursor.classList.add('visible')
    document.body.classList.add('citizen-active')
    setHover(event.target)
  }
  function react(state, duration) {
    if (!active) return
    clearTimeout(stateTimer)
    cursor.dataset.state = 'idle'
    void cursor.offsetWidth
    cursor.dataset.state = state
    stateTimer = setTimeout(() => {
      cursor.dataset.state = 'idle'
      stateTimer = null
    }, duration)
  }
  function hide() {
    active = false
    hoveredSlot = null
    clearTimeout(stateTimer)
    stateTimer = null
    cursor.dataset.state = 'idle'
    cursor.classList.remove('visible', 'approaching')
    document.body.classList.remove('citizen-active')
  }
  document.addEventListener('mousemove', move, { passive: true })
  document.addEventListener(
    'mouseover',
    (event) => {
      if (active) setHover(event.target)
    },
    { passive: true },
  )
  document.addEventListener(
    'mousedown',
    (event) => {
      if (event.button !== 0) return
      move(event)
      react('punch', 200)
    },
    { passive: true },
  )
  document.addEventListener(
    'pointerdown',
    (event) => {
      if (event.pointerType === 'touch') hide()
    },
    { passive: true },
  )
  document.addEventListener(
    'mouseout',
    (event) => {
      if (!event.relatedTarget) hide()
    },
    { passive: true },
  )
  window.addEventListener('gossint:request', (event) => {
    const { slotId, source, status } = event.detail
    if (!active || source !== 'manual' || slotId !== hoveredSlot) return
    setHover(document.getElementById('slot-' + slotId))
    if (status === 'approved') react('released', 550)
    if (status === 'denied') react('denied', 420)
  })
  window.addEventListener('blur', hide)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hide()
  })
  fine.addEventListener('change', () => {
    if (!fine.matches) hide()
  })
  window.addEventListener('pagehide', hide)
}
