import { rhoResponse } from '../server/rhoReadiness.js';

// Hosted endpoint serves fictional Rho sandbox data only. Live access is
// deliberately refused until a business-authenticated backend exists.
export default function handler(req, res) { return rhoResponse(req, res); }
