import { Link } from 'react-router-dom';

const features = [
  {
    icon: '🤖',
    title: 'AI-generated quizzes',
    text: 'Generate fresh MCQs for any course topic on demand.',
    detail: 'Choose a topic and create a focused quiz whenever you are ready to practise. Questions help you check your understanding beyond memorizing notes.',
  },
  {
    icon: '🎯',
    title: 'Weak-topic detection',
    text: 'See exactly which topics need more practice.',
    detail: 'Review your results by topic to spot areas that need attention. Use those insights to spend your study time where it can make the biggest difference.',
  },
  {
    icon: '📈',
    title: 'Progress analytics',
    text: 'Score trends, topic accuracy and course progress.',
    detail: 'Track quiz scores and learning progress over time. Clear performance summaries make it easier to notice improvement and decide what to study next.',
  },
  {
    icon: '⚡',
    title: 'Adaptive difficulty',
    text: 'Quizzes get harder or easier based on your results.',
    detail: 'Questions can adapt to your recent performance, helping you build confidence with the basics and keep progressing toward more challenging material.',
  },
  {
    icon: '⏱️',
    title: 'Instant feedback',
    text: 'Scores and explanations the moment you submit.',
    detail: 'See your score as soon as you finish, along with explanations that help you understand the correct answers and learn from mistakes.',
  },
  {
    icon: '🔐',
    title: 'Secure & role based',
    text: 'JWT login for students, teachers and admins.',
    detail: 'Sign in to a personal account with role-based access. Students can focus on learning while teachers and admins get the tools for their roles.',
  },
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

      <section className="bg-slate-50 py-16 text-slate-800 transition-colors dark:bg-slate-950 dark:text-white">
        <div className="page !py-0">
          <h2 className="text-center text-3xl font-bold">Everything you need to improve</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <article
                key={f.title}
                tabIndex={0}
                className="feature-card rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
              >
                <div className="feature-card-inner">
                  <div className="feature-card-face feature-card-front border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#111a2b]">
                    <div className="text-3xl">{f.icon}</div>
                    <h3 className="mt-3 font-semibold">{f.title}</h3>
                    <p className="mt-1 text-sm text-slate-400">{f.text}</p>
                    <span className="mt-3 block text-xs font-medium text-brand-600 dark:text-brand-300">Hover to learn more</span>
                  </div>
                  <div className="feature-card-face feature-card-back border border-brand-200 bg-brand-50 dark:border-brand-800 dark:bg-brand-950">
                    <div className="text-3xl">{f.icon}</div>
                    <h3 className="mt-3 font-semibold">{f.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{f.detail}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
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
