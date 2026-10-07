import { Link } from 'react-router-dom';

const features = [
  { icon: '🤖', title: 'AI-generated quizzes', text: 'Generate fresh MCQs for any course topic on demand.' },
  { icon: '🎯', title: 'Weak-topic detection', text: 'See exactly which topics need more practice.' },
  { icon: '📈', title: 'Progress analytics', text: 'Score trends, topic accuracy and course progress.' },
  { icon: '⚡', title: 'Adaptive difficulty', text: 'Quizzes get harder or easier based on your results.' },
  { icon: '⏱️', title: 'Instant feedback', text: 'Scores and explanations the moment you submit.' },
  { icon: '🔐', title: 'Secure & role based', text: 'JWT login for students, teachers and admins.' },
];

export default function Landing() {
  return (
    <div>
      <section className="bg-gradient-to-br from-brand-600 via-brand-700 to-purple-700 text-white">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center">
          <span className="rounded-full bg-white/15 px-4 py-1 text-sm">AI-powered personalized learning</span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold leading-tight md:text-6xl">Learn smarter. Know exactly what to improve.</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-brand-100">
            NeuroLearn turns your course content into AI quizzes, tracks every attempt and shows your weak topics so you can practise what matters.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/register" className="btn bg-white !px-6 !py-3 text-brand-700 hover:bg-brand-50">Start learning free</Link>
            <Link to="/login" className="btn border border-white/40 !px-6 !py-3 text-white hover:bg-white/10">I have an account</Link>
          </div>
        </div>
      </section>

      <section className="page !py-16">
        <h2 className="text-center text-3xl font-bold">Everything you need to improve</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="card">
              <div className="text-3xl">{f.icon}</div>
              <h3 className="mt-3 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="page pb-20">
        <div className="card flex flex-col items-center gap-4 !bg-brand-50 py-10 text-center dark:!bg-brand-900/30">
          <h2 className="text-2xl font-bold">Ready to find your weak spots?</h2>
          <Link to="/register" className="btn-primary !px-6 !py-3">Create your account</Link>
        </div>
      </section>
      <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-500 dark:border-slate-800">© NeuroLearn — Mid Sem 2 Project</footer>
    </div>
  );
}
