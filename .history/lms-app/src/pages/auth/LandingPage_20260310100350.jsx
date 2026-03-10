import { useNavigate } from 'react-router-dom'
import './LandingPage.css'
import landingBg from '../../assets/images/landing-bg.png'

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="landing">
      <img src={landingBg} alt="background" className="landing__bg" />

      <div className="landing__overlay" />

      <div className="landing__content">
        <h1 className="landing__title">Building Skills for a Better Tomorrow</h1>
        <p className="landing__subtitle">
          HYTech is a centralized learning management system designed to support
          structured training programs, simplify course management, and enhance
          collaboration between administrators, instructors, and students.
        </p>
        <button className="landing__btn" onClick={() => navigate('/signin')}>
          Get Started
        </button>
      </div>

      <div className="landing__icons">
        <div className="landing__icon-circle">
          <svg width="57" height="41" viewBox="0 0 24 18" fill="none">
            <path d="M2 9L9 16L22 2" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="landing__icon-circle">
          <svg width="63" height="63" viewBox="0 0 24 24" fill="white">
            <path d="M20 6H4V4h16v2zm0 2H4v2h16V8zm-9 4H4v2h7v-2zm9 0h-7v6l3.5-2 3.5 2v-6z" />
          </svg>
        </div>
        <div className="landing__icon-circle">
          <svg width="59" height="59" viewBox="0 0 24 24" fill="none">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      <div className="landing__dots">
        <span className="landing__dot landing__dot--long" />
        <span className="landing__dot landing__dot--long" />
        <span className="landing__dot landing__dot--long" />
        <span className="landing__dot landing__dot--sm" />
        <span className="landing__dot landing__dot--md" />
        <span className="landing__dot landing__dot--xl" />
      </div>
    </div>
  )
}
