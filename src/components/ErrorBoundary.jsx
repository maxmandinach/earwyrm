import { Component } from 'react'
import { Link } from 'react-router-dom'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-transparent">
          <p className="text-charcoal mb-2">Something went wrong</p>
          <p className="text-xs text-charcoal/40 mb-6 max-w-sm text-center">
            {this.state.error?.message}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null })
              window.location.href = '/'
            }}
            className="text-sm text-charcoal/50 hover:text-charcoal transition-colors"
          >
            Go home
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
