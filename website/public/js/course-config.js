// Course identity is selected by the URL; saved work is scoped on the server.
export const isCourseTwo = /^\/course-2(?:\/|$)/.test(location.pathname);
export const courseBase = isCourseTwo ? '/course-2' : '/course';
export const courseApi = isCourseTwo ? '/api/course2' : '/api/course';
export const courseDataPath = isCourseTwo ? '/data/course-2.json' : '/data/course.json';
export function courseHref(href) { return href.replace(/^\/course(?=\/|\?|$)/, courseBase); }
export const courseIdentity = isCourseTwo ? {
  number: 2, title: 'The integrated course', shortTitle: 'Course 2',
  headline: ['Understand more.', 'Live deliberately.'],
  description: 'Connect the ideas. Build the skills. Work through one integrated curriculum in self-knowledge, reasoning, relationships, strategy, and practical life.',
} : {
  number: 1, title: 'The WhiteEye course', shortTitle: 'Course 1',
  headline: ['A life examined.', 'A life practiced.'],
  description: 'Read WhiteEye’s original words. Ask better questions. Work through the ideas in your own life, one lesson at a time.',
};
