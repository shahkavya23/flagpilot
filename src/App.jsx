import { useFlags } from '@flagsmith/flagsmith/react'
import './App.css'

function App() {
  const flags = useFlags(['ai_release_planner'])
  const plannerEnabled = flags.ai_release_planner?.enabled

  return (
    <main id="center">
      <section>
        <p>FLAGPILOT</p>
        <h1>Ship features with confidence</h1>
        <p>
          An AI release agent that prepares safe Flagsmith rollout plans and
          waits for human approval before making changes.
        </p>

        {plannerEnabled ? (
          <button type="button">Create a rollout plan</button>
        ) : (
          <p>The AI Release Planner is currently disabled by Flagsmith.</p>
        )}
      </section>
    </main>
  )
}

export default App
