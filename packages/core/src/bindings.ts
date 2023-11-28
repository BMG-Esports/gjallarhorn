import { Newable } from "./@types/types";
import {
  TCacheService,
  TCastersBackend,
  TDBService,
  TErrorService,
  TGameBackend,
  TLowerThirdsBackend,
  TOutputService,
  TPlayersBackend,
  TPlayerService,
  TQueueBackend,
  TServerService,
  TStartGGService,
  TSocketService,
  TStatusBackend,
  TSystem,
  TTickerBackend,
  TTournamentBackend,
} from "@bmg-esports/gjallarhorn-tokens";

import { System } from "./system";

import { CacheService } from "./services/cache";
import { DBService } from "./services/db";
import { ErrorService } from "./services/error";
import { OutputService } from "./services/output";
import { PlayerService } from "./services/player";
import { ServerService } from "./services/server";
import { StartGGService } from "./services/startgg";
import { SocketService } from "./services/socket";

import { StatusBackend } from "./backends/pages/status";
import { TournamentBackend } from "./backends/pages/tournament";
import { CastersBackend } from "./backends/cards/casters";
import { GameBackend } from "./backends/cards/game";
import { LowerThirdsBackend } from "./backends/cards/lower-thirds";
import { PlayersBackend } from "./backends/cards/players";
import { QueueBackend } from "./backends/cards/queue";
import { TickerBackend } from "./backends/cards/ticker";

const bindings: { [token: symbol]: Newable } = {
  [TSystem]: System,

  [TCacheService]: CacheService,
  [TDBService]: DBService,
  [TErrorService]: ErrorService,
  [TOutputService]: OutputService,
  [TPlayerService]: PlayerService,
  [TServerService]: ServerService,
  [TStartGGService]: StartGGService,
  [TSocketService]: SocketService,

  [TStatusBackend]: StatusBackend,
  [TTournamentBackend]: TournamentBackend,

  [TCastersBackend]: CastersBackend,
  [TGameBackend]: GameBackend,
  [TLowerThirdsBackend]: LowerThirdsBackend,
  [TPlayersBackend]: PlayersBackend,
  [TQueueBackend]: QueueBackend,
  [TTickerBackend]: TickerBackend,
};
export default bindings;
