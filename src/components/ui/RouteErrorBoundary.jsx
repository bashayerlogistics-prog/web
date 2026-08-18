import { Component } from 'react';
import { Link } from 'react-router-dom';

/**
 * Stops a single route crash from blanking the whole public site.
 */
export default class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.warn('Route render failed:', error);
  }

  componentDidUpdate(prevProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50svh] grid place-items-center px-4 py-16 text-center">
          <div className="max-w-md">
            <p className="text-lg font-black text-brand mb-2">Something went wrong</p>
            <p className="text-sm text-gray-500 mb-6">Please go back and try again.</p>
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-xl bg-brand text-white font-bold px-5 py-2.5"
            >
              Home
            </Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
