import { useState } from 'react'
import { useFlags } from '@flagsmith/flagsmith/react'
import './App.css'

const examples = [
  {
    label: 'Banking login',
    feature: 'Add fingerprint login to a banking app',
    metric: 'Users log in successfully without a password',
  },
  {
    label: 'New checkout',
    feature: 'Replace the multi-page checkout with a single-page checkout',
    metric: 'More users complete their purchase',
  },
  {
    label: 'AI support',
    feature: 'Add AI-generated reply suggestions for support agents',
    metric: 'Support agents resolve tickets faster',
  },
]

function App() {
  const flags = useFlags(['ai_release_planner'])
  const plannerEnabled = flags.ai_release_planner?.enabled
  const [featureRequest, setFeatureRequest] = useState('')
  const [successMetric, setSuccessMetric] = useState('')
  const [plan, setPlan] = useState(null)
  const [approved, setApproved] = useState(false)
  const [approving, setApproving] = useState(false)
  const [approvalMessage, setApprovalMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function applyExample(example) {
    setFeatureRequest(example.feature)
    setSuccessMetric(example.metric)
    setPlan(null)
    setApproved(false)
    setError('')
  }

  async function preparePlan(event) {
    event.preventDefault()
    setApproved(false)
    setApprovalMessage('')
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featureRequest, successMetric }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to prepare a plan.')
      setPlan(data)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  async function approvePlan() {
    setApproving(true)
    setError('')

    try {
      const response = await fetch('/api/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flagName: plan.flagName, reasoning: plan.reasoning }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Flagsmith could not create the flag.')
      setApproved(true)
      setApprovalMessage(data.message)
    } catch (approvalError) {
      setError(approvalError.message)
    } finally {
      setApproving(false)
    }
  }

  return (
    <div className="app-shell">
      <div className="ambient-orb orb-one" />
      <div className="ambient-orb orb-two" />

      <header className="topbar">
        <a className="brand" href="/" aria-label="FlagPilot home">
          <span className="brand-glyph">FP</span>
          <span>FlagPilot</span>
        </a>
        <nav aria-label="Workflow">
          <span>01 Plan</span>
          <span>02 Approve</span>
          <span>03 Ship</span>
        </nav>
        <div className="connection-status"><span className="status-dot" /> Live with Flagsmith</div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow"><span>01</span> Release intelligence</p>
            <h1>Move fast.<br /><em>Release carefully.</em></h1>
            <p className="subtitle">
              An AI release agent that turns rough feature ideas into controlled,
              measurable Flagsmith rollouts—with a human at the final switch.
            </p>
            <div className="hero-meta">
              <span>Risk-aware planning</span>
              <span>Human approval</span>
              <span>Flagsmith-native</span>
            </div>
          </div>

          <div className="signal-visual" aria-hidden="true">
            <div className="signal-ring ring-one" />
            <div className="signal-ring ring-two" />
            <div className="signal-core">AI</div>
            <span className="signal-node node-a">Plan</span>
            <span className="signal-node node-b">Guard</span>
            <span className="signal-node node-c">Ship</span>
          </div>
        </section>

        {!plannerEnabled ? (
          <section className="disabled-card">
            <p className="panel-index">Planner / offline</p>
            <h2>The release agent is paused.</h2>
            <p>Enable <code>ai_release_planner</code> in Flagsmith to continue.</p>
          </section>
        ) : (
          <section className="studio">
            <div className="studio-heading">
              <div>
                <p className="eyebrow"><span>02</span> Build the plan</p>
                <h2>From idea to controlled release.</h2>
              </div>
              <p>Describe the change. FlagPilot handles the release logic and stops before execution.</p>
            </div>

            <div className="workspace">
              <form className="request-card" onSubmit={preparePlan}>
                <div className="panel-topline"><span>Input brief</span><span>01</span></div>

                <div className="example-block">
                  <p>Start with an example</p>
                  <div className="example-chips">
                    {examples.map((example) => (
                      <button key={example.label} type="button" onClick={() => applyExample(example)}>
                        {example.label}<span>+</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="field-shell">
                  <div className="field-label-row">
                    <label htmlFor="feature-request"><span>01</span> What are you shipping?</label>
                    <span>{featureRequest.length}/180</span>
                  </div>
                  <textarea
                    id="feature-request"
                    value={featureRequest}
                    onChange={(event) => setFeatureRequest(event.target.value)}
                    placeholder="Describe the feature and who it is for..."
                    maxLength={180}
                    required
                  />
                  <div className="field-hint">Be specific—the AI uses this to judge release risk.</div>
                </div>

                <div className="field-shell compact">
                  <div className="field-label-row">
                    <label htmlFor="success-metric"><span>02</span> What proves it worked?</label>
                    <span>{successMetric.length}/120</span>
                  </div>
                  <input
                    id="success-metric"
                    value={successMetric}
                    onChange={(event) => setSuccessMetric(event.target.value)}
                    placeholder="Describe one action the team can measure..."
                    maxLength={120}
                    required
                  />
                  <div className="field-hint">Use a measurable action, not a general feeling.</div>
                </div>

                <button className="primary-button" type="submit" disabled={loading}>
                  <span>{loading ? 'Building release logic...' : 'Generate safe rollout'}</span>
                  <b>↗</b>
                </button>
                {error && <p className="error-message">{error}</p>}
              </form>

              <article className={`plan-card ${plan ? 'has-plan' : ''}`}>
                <div className="panel-topline"><span>Release intelligence</span><span>02</span></div>
                {!plan ? (
                  <div className="empty-state">
                    <div className="empty-pulse"><span /></div>
                    <p className="panel-index">Awaiting your brief</p>
                    <h3>A safer release starts here.</h3>
                    <p>The AI will assess risk, choose a rollout and wait for your approval.</p>
                  </div>
                ) : (
                  <div className="plan-content">
                    <div className="plan-heading">
                      <div>
                        <p className="panel-index">Proposed flag</p>
                        <h3>{plan.flagName}</h3>
                      </div>
                      <span className={approved ? 'badge approved' : 'badge'}>
                        {approved ? 'Approved' : 'Human review'}
                      </span>
                    </div>

                    <dl>
                      <div><dt>Risk</dt><dd className={`risk-${plan.riskLevel}`}>{plan.riskLevel}</dd></div>
                      <div><dt>First cohort</dt><dd>{plan.rollout}</dd></div>
                      <div><dt>Success signal</dt><dd>{plan.metric}</dd></div>
                      <div className="wide"><dt>Automatic guardrail</dt><dd>{plan.safetyRule}</dd></div>
                      <div className="wide"><dt>Why this plan</dt><dd>{plan.reasoning}</dd></div>
                    </dl>

                    {approved ? (
                      <div className="success-message"><span>✓</span>{approvalMessage}</div>
                    ) : (
                      <button className="approve-button" type="button" onClick={approvePlan} disabled={approving}>
                        <span>{approving ? 'Creating in Flagsmith...' : 'Approve & create flag'}</span><b>→</b>
                      </button>
                    )}
                  </div>
                )}
              </article>
            </div>
          </section>
        )}
      </main>

      <footer><span>FlagPilot / 2026</span><span>Built for Toggle Wars</span><span>Human-approved AI</span></footer>
    </div>
  )
}

export default App
