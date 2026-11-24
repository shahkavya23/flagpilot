import { useState } from 'react'
import { useFlags } from '@flagsmith/flagsmith/react'
import './App.css'

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

      if (!response.ok) {
        throw new Error(data.error || 'Unable to prepare a plan.')
      }

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
        body: JSON.stringify({
          flagName: plan.flagName,
          reasoning: plan.reasoning,
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Flagsmith could not create the flag.')
      }

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
      <header className="topbar">
        <a className="brand" href="/" aria-label="FlagPilot home">
          <span className="brand-mark">F</span>
          <span>FlagPilot</span>
        </a>
        <div className="connection-status">
          <span className="status-dot" /> Connected to Flagsmith
        </div>
      </header>

      <main>
        <section className="hero-copy">
          <p className="eyebrow">AI RELEASE AGENT</p>
          <h1>Turn a feature request into a safe rollout.</h1>
          <p className="subtitle">
            FlagPilot prepares the flag, rollout stages and success metric.
            Nothing changes until a human approves the plan.
          </p>
        </section>

        {!plannerEnabled ? (
          <section className="disabled-card">
            <span>Planner unavailable</span>
            <h2>The AI Release Planner is disabled.</h2>
            <p>Enable <code>ai_release_planner</code> in Flagsmith to continue.</p>
          </section>
        ) : (
          <div className="workspace">
            <form className="request-card" onSubmit={preparePlan}>
              <div className="step-label"><span>1</span> Describe the change</div>
              <label htmlFor="feature-request">Feature request</label>
              <textarea
                id="feature-request"
                value={featureRequest}
                onChange={(event) => setFeatureRequest(event.target.value)}
                placeholder="Example: Release the new onboarding checklist"
                required
              />

              <label htmlFor="success-metric">What counts as success?</label>
              <input
                id="success-metric"
                value={successMetric}
                onChange={(event) => setSuccessMetric(event.target.value)}
                placeholder="Example: User completes onboarding"
                required
              />

              <button className="primary-button" type="submit" disabled={loading}>
                {loading ? 'AI is preparing the plan…' : 'Prepare rollout plan'} <span>→</span>
              </button>
              {error && <p className="error-message">{error}</p>}
            </form>

            <section className={`plan-card ${plan ? 'has-plan' : ''}`}>
              <div className="step-label"><span>2</span> Review and approve</div>
              {!plan ? (
                <div className="empty-state">
                  <div className="empty-icon">↗</div>
                  <h2>Your rollout plan will appear here.</h2>
                  <p>FlagPilot will always stop for human approval.</p>
                </div>
              ) : (
                <div className="plan-content">
                  <div className="plan-heading">
                    <div>
                      <p className="small-label">PROPOSED FLAG</p>
                      <h2>{plan.flagName}</h2>
                    </div>
                    <span className={approved ? 'badge approved' : 'badge'}>
                      {approved ? 'Approved' : 'Needs approval'}
                    </span>
                  </div>

                  <dl>
                    <div><dt>Risk level</dt><dd className={`risk-${plan.riskLevel}`}>{plan.riskLevel}</dd></div>
                    <div><dt>Rollout</dt><dd>{plan.rollout}</dd></div>
                    <div><dt>Success metric</dt><dd>{plan.metric}</dd></div>
                    <div><dt>Safety rule</dt><dd>{plan.safetyRule}</dd></div>
                    <div><dt>AI reasoning</dt><dd>{plan.reasoning}</dd></div>
                  </dl>

                  {approved ? (
                    <div className="success-message">✓ {approvalMessage}</div>
                  ) : (
                    <button className="approve-button" type="button" onClick={approvePlan} disabled={approving}>
                      {approving ? 'Creating flag in Flagsmith…' : 'Approve and create flag'}
                    </button>
                  )}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
