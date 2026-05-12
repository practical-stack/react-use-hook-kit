import { useBoolean, useCounter, useDebounce, useLocalStorage, useToggle } from 'react-hook-kit'
import { useState } from 'react'

export function HookDemos() {
  const boolean = useBoolean()
  const toggle = useToggle(true)
  const counter = useCounter(0, { max: 10, min: 0 })
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 350)
  const storage = useLocalStorage('react-hook-kit-docs-theme', 'system')

  return (
    <div className="demo-grid">
      <section className="demo-card">
        <h3>useBoolean</h3>
        <p>{boolean.value ? 'Enabled' : 'Disabled'}</p>
        <div className="button-row">
          <button type="button" onClick={boolean.setTrue}>
            On
          </button>
          <button type="button" onClick={boolean.setFalse}>
            Off
          </button>
          <button type="button" onClick={boolean.toggle}>
            Toggle
          </button>
        </div>
      </section>

      <section className="demo-card">
        <h3>useToggle</h3>
        <p>{toggle.value ? 'Open' : 'Closed'}</p>
        <button type="button" onClick={toggle.toggle}>
          Toggle
        </button>
      </section>

      <section className="demo-card">
        <h3>useCounter</h3>
        <p>{counter.count}</p>
        <div className="button-row">
          <button type="button" onClick={() => counter.decrement()}>
            -1
          </button>
          <button type="button" onClick={() => counter.increment()}>
            +1
          </button>
          <button type="button" onClick={counter.reset}>
            Reset
          </button>
        </div>
      </section>

      <section className="demo-card">
        <h3>useDebounce</h3>
        <label>
          Search
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Type to debounce"
          />
        </label>
        <p>Debounced: {debouncedQuery || 'empty'}</p>
      </section>

      <section className="demo-card">
        <h3>useLocalStorage</h3>
        <label>
          Preference
          <select value={storage.value} onChange={(event) => storage.setValue(event.target.value)}>
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <button type="button" onClick={storage.removeValue}>
          Reset
        </button>
      </section>
    </div>
  )
}
