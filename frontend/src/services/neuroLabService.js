import api from './api';
export const getNeuroLabSnapshot = async () => {
  const [stats, courses, weakTopics] = await Promise.all([
    api.get('/results/stats'), api.get('/courses/my'), api.get('/results/weak-topics')
  ]);
  return { stats: stats.data, courses: courses.data, weakTopics: weakTopics.data.topics || [] };
};
