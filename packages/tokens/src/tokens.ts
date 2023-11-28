import { createToken } from "./support";

export const TSystem = createToken("System");

// Services
export const TCacheService = createToken("CacheService");
export const TDBService = createToken("DBService");
export const TErrorService = createToken("ErrorService");
export const TOutputService = createToken("OutputService");
export const TPlayerService = createToken("PlayerService");
export const TServerService = createToken("ServerService");
export const TStartGGService = createToken("StartGGService");
export const TSocketService = createToken("SocketService");

// Page Backends
export const TStatusBackend = createToken("StatusBackend");
export const TTournamentBackend = createToken("TournamentBackend");

// Card Backends
export const TCastersBackend = createToken("CastersBackend");
export const TGameBackend = createToken("GameBackend");
export const TLowerThirdsBackend = createToken("LowerThirdsBackend");
export const TPlayersBackend = createToken("PlayersBackend");
export const TQueueBackend = createToken("QueueBackend");
export const TTickerBackend = createToken("TickerBackend");
