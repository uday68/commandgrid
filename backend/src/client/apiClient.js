// Around line 92, replace the incorrect URL format:
// Change from:
const getMeetings = () => {
  return api.get(`/api/meetings`);
};

// To:
const getMeetings = () => {
  return api.get(`/meetings`);
};
