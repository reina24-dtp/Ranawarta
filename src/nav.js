export const go = (path) => { window.location.hash = path; window.scrollTo(0, 0); };
export const goHome = (id) => {
  window.location.hash = "";
  setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
};
