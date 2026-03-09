import axios from 'axios';

const BASE_URL = 'http://localhost:8080';

export const getInterviewers = () => axios.get(`${BASE_URL}/get-interviewers/`);
export const getCandidates = () => axios.get(`${BASE_URL}/get-candidates/`);
