export type ID = number;
export type Timestamp = number;

/** A team, either at the global level or within the context of an event */
export interface Team {
  id: ID;
  /** Uniquely identifying token for team. Same as the hashed part of the slug */
  discriminator: string;
  /** @deprecated Use the entrant field off the EventTeam type */
  entrant: Entrant;
  /** @deprecated Use the event field off the EventTeam type */
  event: Event;
  images?: (null | Image)[];
  members?: (null | TeamMember)[];
  name: string;
}

/** Represents the state of an activity */
export type ActivityState =
  | "CREATED"
  | "ACTIVE"
  | "COMPLETED"
  | "READY"
  | "INVALID"
  | "CALLED"
  | "QUEUED";

/** A user's address */
export interface Address {
  id?: ID;
  city?: string;
  country?: string;
  countryId?: number;
  state?: string;
  stateId?: number;
}

/** Represents the name of the third-party service (e.g Twitter) for OAuth */
export type AuthorizationType =
  | "TWITTER"
  | "TWITCH"
  | "STEAM"
  | "DISCORD"
  | "XBOX"
  | "EPIC"
  | "BATTLENET"
  | "MIXER";

/** The type of Bracket format that a Phase is configured with. */
export type BracketType =
  | "SINGLE_ELIMINATION"
  | "DOUBLE_ELIMINATION"
  | "ROUND_ROBIN"
  | "SWISS"
  | "EXHIBITION"
  | "CUSTOM_SCHEDULE"
  | "MATCHMAKING"
  | "ELIMINATION_ROUNDS"
  | "RACE"
  | "CIRCUIT";

/** A character in a videogame */
export interface Character {
  id?: ID;
  images?: (null | Image)[];
  /** Name of Character */
  name?: string;
}

/** Comparison operator */
export type Comparator =
  | "GREATER_THAN"
  | "GREATER_THAN_OR_EQUAL"
  | "EQUAL"
  | "LESS_THAN_OR_EQUAL"
  | "LESS_THAN";

/** Name, address, etc */
export interface ContactInfo {
  id?: ID;
  /** Participant City Name */
  city?: string;
  /** Participant Country Name */
  country?: string;
  /** Participant Country (region) id */
  countryId?: number;
  name?: string;
  /** First Name */
  nameFirst?: string;
  /** Last Name */
  nameLast?: string;
  /** Participant State Name */
  state?: string;
  /** Participant State (region) id */
  stateId?: number;
  /** Zip or Postal Code */
  zipcode?: string;
}

/** An entrant in an event */
export interface Entrant {
  id?: ID;
  event?: Event;
  /** Entrant's seed number in the first phase of the event. */
  initialSeedNum?: number;
  isDisqualified?: boolean;
  /** The entrant name as it appears in bracket: gamerTag of the participant or team name */
  name?: string;
  /** Paginated sets for this entrant */
  paginatedSets?: SetConnection;
  participants?: (null | Participant)[];
  seeds?: (null | Seed)[];
  skill?: number;
  /** Standing for this entrant given an event. All entrants queried must be in the same event (for now). */
  standing?: Standing;
  stream?: Streams;
  streams?: (null | Streams)[];
  /** Team linked to this entrant, if one exists */
  team?: Team;
}

export interface EntrantConnection {
  pageInfo?: PageInfo;
  nodes?: (null | Entrant)[];
}

/** An event in a tournament */
export interface Event {
  id?: ID;
  /** How long before the event start will the check-in end (in seconds) */
  checkInBuffer?: number;
  /** How long the event check-in will last (in seconds) */
  checkInDuration?: number;
  /** Whether check-in is enabled for this event */
  checkInEnabled?: boolean;
  /** Rough categorization of event tier, denoting relative importance in the competitive scene */
  competitionTier?: number;
  /** When the event was created (unix timestamp) */
  createdAt?: Timestamp;
  /** Last date attendees are able to create teams for team events */
  deckSubmissionDeadline?: Timestamp;
  /** Maximum number of participants each Entrant can have */
  entrantSizeMax?: number;
  /** Minimum number of participants each Entrant can have */
  entrantSizeMin?: number;
  /** The entrants that belong to an event, paginated by filter criteria */
  entrants?: EntrantConnection;
  /** Whether the event has decks */
  hasDecks?: boolean;
  /** Are player tasks enabled for this event */
  hasTasks?: boolean;
  images?: (null | Image)[];
  /** Whether the event is an online event or not */
  isOnline?: boolean;
  league?: League;
  /** Markdown field for match rules/instructions */
  matchRulesMarkdown?: string;
  /** Title of event set by organizer */
  name?: string;
  /** Gets the number of entrants in this event */
  numEntrants?: number;
  /** The phase groups that belong to an event. */
  phaseGroups?: (null | PhaseGroup)[];
  /** The phases that belong to an event. */
  phases?: (null | Phase)[];
  /** TO settings for prizing */
  prizingInfo?: JSON;
  publishing?: JSON;
  /** Markdown field for event rules/instructions */
  rulesMarkdown?: string;
  /** Id of the event ruleset */
  rulesetId?: number;
  /** Settings pulled from the event ruleset, if one exists */
  rulesetSettings?: JSON;
  /** Paginated sets for this Event */
  sets?: SetConnection;
  slug?: string;
  /** Paginated list of standings */
  standings?: StandingConnection;
  /** When does this event start? */
  startAt?: Timestamp;
  /** The state of the Event. */
  state?: ActivityState;
  /** Paginated stations on this event */
  stations?: StationsConnection;
  /** Last date attendees are able to create teams for team events */
  teamManagementDeadline?: Timestamp;
  /** If this is a teams event, returns whether or not teams can set custom names */
  teamNameAllowed?: boolean;
  /** Team roster size requirements */
  teamRosterSize?: TeamRosterSize;
  tournament?: Tournament;
  /** The type of the event, whether an entrant will have one participant or multiple */
  type?: number;
  /** When the event was last modified (unix timestamp) */
  updatedAt?: Timestamp;
  /** Whether the event uses the new EventSeeds for seeding */
  useEventSeeds?: boolean;
  /** The entrant (if applicable) for a given user in this event */
  userEntrant?: Entrant;
  videogame?: Videogame;
  /** The waves being used by the event */
  waves?: (null | Wave)[];
}

export interface EventConnection {
  pageInfo?: PageInfo;
  nodes?: (null | Event)[];
}

/** Name and Gamertag of the owner of an event in a league */
export interface EventOwner {
  eventId?: ID;
  email?: string;
  gamerTag?: string;
  fullName?: string;
}

export interface EventOwnerConnection {
  pageInfo?: PageInfo;
  nodes?: (null | EventOwner)[];
}

/** An event-level Team, in the context of some competition */
export interface EventTeam {
  id?: ID;
  /** Uniquely identifying token for team. Same as the hashed part of the slug */
  discriminator?: string;
  entrant?: Entrant;
  event?: Event;
  globalTeam?: GlobalTeam;
  images?: (null | Image)[];
  members?: (null | TeamMember)[];
  name?: string;
}

export interface EventTeamConnection {
  pageInfo?: PageInfo;
  nodes?: (null | EventTeam)[];
}

/** Used for league application tiers */
export interface EventTier {
  id?: ID;
  /** Name of this tier */
  name?: string;
}

/** A game represents a single game within a set. */
export interface Game {
  id?: ID;
  /** Score of entrant 1. For smash, this is equivalent to stocks remaining. */
  entrant1Score?: number;
  /** Score of entrant 2. For smash, this is equivalent to stocks remaining. */
  entrant2Score?: number;
  images?: (null | Image)[];
  orderNum?: number;
  /** Selections for this game such as character, etc. */
  selections?: (null | GameSelection)[];
  /** The stage that this game was played on (if applicable) */
  stage?: Stage;
  state?: number;
  winnerId?: number;
}

/** A selection for this game. i.e. character/stage selection, etc */
export interface GameSelection {
  /** If this is a character selection, returns the selected character. */
  character?: Character;
  id?: ID;
  /** The entrant who this selection is for */
  entrant?: Entrant;
  orderNum?: number;
  /**
   * The participant who this selection is for. This is only populated if there are
   * selections for multiple participants of a single entrant
   */
  participant?: Participant;
  selectionType?: GameSelectionType;
  selectionValue?: number;
}

/** The type of selection i.e. is it for a character or something else */
export type GameSelectionType = "CHARACTER";

/** Global Team */
export interface GlobalTeam {
  id?: ID;
  /** Uniquely identifying token for team. Same as the hashed part of the slug */
  discriminator?: string;
  entrant?: Entrant;
  event?: Event;
  eventTeams?: EventTeamConnection;
  images?: (null | Image)[];
  /** Leagues-level teams for leagues this team is competing in */
  leagueTeams?: EventTeamConnection;
  members?: (null | TeamMember)[];
  name?: string;
}

/** An image */
export interface Image {
  id?: ID;
  height?: number;
  ratio?: number;
  type?: string;
  url?: string;
  width?: number;
}

/** A league */
export interface League {
  id?: ID;
  addrState?: string;
  city?: string;
  countryCode?: string;
  /** When the tournament was created (unix timestamp) */
  createdAt?: Timestamp;
  currency?: string;
  /** When the tournament ends */
  endAt?: Timestamp;
  entrantCount?: number;
  eventOwners?: EventOwnerConnection;
  /** When does event registration close */
  eventRegistrationClosesAt?: Timestamp;
  /** Paginated list of events in a league */
  events?: EventConnection;
  /** Hacked "progression" into this final event */
  finalEventId?: number;
  /** True if tournament has at least one offline event */
  hasOfflineEvents?: boolean;
  hasOnlineEvents?: boolean;
  hashtag?: string;
  images?: (null | Image)[];
  /** True if tournament has at least one online event */
  isOnline?: boolean;
  lat?: number;
  links?: TournamentLinks;
  lng?: number;
  mapsPlaceId?: string;
  /** The tournament name */
  name?: string;
  /** Top X number of people in the standings who progress to final event */
  numProgressingToFinalEvent?: number;
  numUniquePlayers?: number;
  postalCode?: string;
  primaryContact?: string;
  primaryContactType?: string;
  /** Publishing settings for this tournament */
  publishing?: JSON;
  /** When does registration for the tournament end */
  registrationClosesAt?: Timestamp;
  rules?: string;
  /** The short slug used to form the url */
  shortSlug?: string;
  /** Whether standings for this league should be visible */
  showStandings?: boolean;
  slug?: string;
  /** Paginated list of standings */
  standings?: StandingConnection;
  /** When the tournament Starts */
  startAt?: Timestamp;
  /** State of the tournament, can be ActivityState::CREATED, ActivityState::ACTIVE, or ActivityState::COMPLETED */
  state?: number;
  /** When is the team creation deadline */
  teamCreationClosesAt?: Timestamp;
  tiers?: (null | EventTier)[];
  /** The timezone of the tournament */
  timezone?: string;
  /** The type of tournament from TournamentType */
  tournamentType?: number;
  /** When the tournament was last modified (unix timestamp) */
  updatedAt?: Timestamp;
  /** Build Tournament URL */
  url?: string;
  venueAddress?: string;
  venueName?: string;
  videogames?: (null | Videogame)[];
}

export interface LeagueConnection {
  pageInfo?: PageInfo;
  nodes?: (null | League)[];
}

/** Different options available for verifying player-reported match results */
export type MatchConfigVerificationMethod =
  | "TWITCH"
  | "STREAM_ME"
  | "ANY"
  | "MIXER"
  | "YOUTUBE";

export interface Mutation {
  /** Delete a phase by id */
  deletePhase?: boolean;
  /** Delete a station by id */
  deleteStation?: boolean;
  /** Delete a wave by id */
  deleteWave?: boolean;
  /** Update a set to called state */
  markSetCalled?: Set;
  /** Update a set to called state */
  markSetInProgress?: Set;
  /**
   * Report set winner or game stats for a H2H bracket set. If winnerId is
   * supplied, mark set as complete. gameData parameter will overwrite any existing
   * reported game data.
   */
  reportBracketSet?: (null | Set)[];
  /** Resets set to initial state, can affect other sets and phase groups */
  resetSet?: Set;
  /** Automatically attempt to resolve all schedule conflicts. Returns a list of changed seeds */
  resolveScheduleConflicts?: (null | Seed)[];
  /** Swap two seed ids in a phase */
  swapSeeds?: (null | Seed)[];
  /** Update set of phase groups in a phase */
  updatePhaseGroups?: (null | PhaseGroup)[];
  /** Update the seeding for a phase */
  updatePhaseSeeding?: Phase;
  /** Create or update a Phase */
  upsertPhase?: Phase;
  /** Add or update a station by id */
  upsertStation?: Stations;
  /** Add or update a wave by id */
  upsertWave?: Wave;
}

export interface PageInfo {
  total?: number;
  totalPages?: number;
  page?: number;
  perPage?: number;
  sortBy?: string;
  filter?: JSON;
}

/** A participant of a tournament; either a spectator or competitor */
export interface Participant {
  id?: ID;
  /** If this participant was checked-in by admin */
  checkedIn?: boolean;
  /** The time this participant was checked-in by admin */
  checkedInAt?: Timestamp;
  /** Info for connected accounts to external services. */
  connectedAccounts?: JSON;
  /**
   * Contact Info selected during registration. Falls back to User.location and/or
   * User.name if necessary. These fields are for admin use only. If you are not a
   * tournament admin or the participant being queried, these fields will be null.
   * Do not display this information publicly.
   */
  contactInfo?: ContactInfo;
  /** Email of the user, only available to admins within 18 months of tournament completion for tournament administrators. */
  email?: string;
  /** Entrants associated with this Participant, if applicable */
  entrants?: (null | Entrant)[];
  /** The events this participant registered for within a Tournament. */
  events?: (null | Event)[];
  /** The tag that was used when the participant registered, e.g. Mang0 */
  gamerTag?: string;
  images?: (null | Image)[];
  player?: Player;
  /** The prefix that the user set for this Tournament, e.g. C9 */
  prefix?: string;
  /** Tournament Admin viewable field. Shows details for required social connections */
  requiredConnections?: (null | ProfileAuthorization)[];
  /** The user this participant is associated to. */
  user?: User;
  /** If this participant is verified as actually being in the tournament */
  verified?: boolean;
}

export interface ParticipantConnection {
  pageInfo?: PageInfo;
  nodes?: (null | Participant)[];
}

/** A phase in an event */
export interface Phase {
  id?: ID;
  /** The bracket type of this phase. */
  bracketType?: BracketType;
  /** The Event that this phase belongs to */
  event?: Event;
  /** Number of phase groups in this phase */
  groupCount?: number;
  /** Is the phase an exhibition or not. */
  isExhibition?: boolean;
  /** Name of phase e.g. Round 1 Pools */
  name?: string;
  /** The number of seeds this phase contains. */
  numSeeds?: number;
  paginatedSeeds?: SeedConnection;
  /** Phase groups under this phase, paginated */
  phaseGroups?: PhaseGroupConnection;
  /** The relative order of this phase within an event */
  phaseOrder?: number;
  /** Paginated seeds for this phase */
  seeds?: SeedConnection;
  /** Paginated sets for this Phase */
  sets?: SetConnection;
  /** State of the phase */
  state?: ActivityState;
  waves?: (null | Wave)[];
}

/** A group within a phase */
export interface PhaseGroup {
  id?: ID;
  /** The bracket type of this group's phase. */
  bracketType?: BracketType;
  /** URL for this phase groups's bracket. */
  bracketUrl?: string;
  /** Unique identifier for this group within the context of its phase */
  displayIdentifier?: string;
  /** For the given phase group, this is the start time of the first round that occurs in the group. */
  firstRoundTime?: Timestamp;
  numRounds?: number;
  paginatedSeeds?: SeedConnection;
  /** Paginated sets on this phaseGroup */
  paginatedSets?: SetConnection;
  /** The phase associated with this phase group */
  phase?: Phase;
  /** The progressions out of this phase group */
  progressionsOut?: (null | Progression)[];
  rounds?: (null | Round)[];
  seedMap?: JSON;
  /** Paginated seeds for this phase group */
  seeds?: SeedConnection;
  /** Paginated sets on this phaseGroup */
  sets?: SetConnection;
  /** Paginated list of standings */
  standings?: StandingConnection;
  /** Unix time the group is scheduled to start. This info could also be on the wave instead. */
  startAt?: Timestamp;
  state?: number;
  tiebreakOrder?: JSON;
  wave?: Wave;
}

export interface PhaseGroupConnection {
  pageInfo?: PageInfo;
  nodes?: (null | PhaseGroup)[];
}

/** A player */
export interface Player {
  id?: ID;
  gamerTag?: string;
  prefix?: string;
  /** Most recent active & published rankings */
  rankings?: (null | PlayerRank)[];
  /** Recent sets for this player. */
  recentSets?: (null | Set)[];
  /** Recent standings */
  recentStandings?: (null | Standing)[];
  /** Set history for this player. */
  sets?: SetConnection;
  user?: User;
}

/** A player's ranks */
export interface PlayerRank {
  id?: ID;
  /** The player's placement on the ranking */
  rank?: number;
  title?: string;
}

/** An OAuth ProfileAuthorization object */
export interface ProfileAuthorization {
  id?: ID;
  /** The id given by the external service */
  externalId?: string;
  /** The username given by the external service (including discriminator if discord) */
  externalUsername?: string;
  stream?: Stream;
  /** The name of the external service providing this auth i.e. "twitch" */
  type?: AuthorizationType;
  url?: string;
}

/** A connection between a placement in an origin phase group to a destination seed. */
export interface Progression {
  id?: ID;
  originOrder?: number;
  originPhase?: Phase;
  originPhaseGroup?: PhaseGroup;
  originPlacement?: number;
}

export interface Query {
  /** Returns the authenticated user */
  currentUser?: User;
  /** Returns an entrant given its id */
  entrant?: Entrant;
  /** Returns an event given its id or slug */
  event?: Event;
  /** Returns a league given its id or slug */
  league?: League;
  /** Paginated, filterable list of leagues */
  leagues?: LeagueConnection;
  /** Returns a participant given its id */
  participant?: Participant;
  /** Returns a phase given its id */
  phase?: Phase;
  /** Returns a phase group given its id */
  phaseGroup?: PhaseGroup;
  /** Returns a player given an id */
  player?: Player;
  /** Returns a phase seed given its id */
  seed?: Seed;
  /** Returns a set given its id */
  set?: Set;
  /** A shop entity */
  shop?: Shop;
  /** Returns an stream given its id */
  stream?: Streams;
  /** Returns all the stream queues for a given tournament */
  streamQueue?: (null | StreamQueue)[];
  /** Returns a team given its id */
  team?: Team;
  /** Returns a tournament given its id or slug */
  tournament?: Tournament;
  /** Paginated, filterable list of tournaments */
  tournaments?: TournamentConnection;
  /** Returns a user given a user slug of the form user/abc123, or id */
  user?: User;
  /** Returns a videogame given its id */
  videogame?: Videogame;
  /** Returns paginated list of videogames matching the search criteria. */
  videogames?: VideogameConnection;
}

/** Race specific bracket configuration */
export interface RaceBracketConfig {
  automaticEndTime?: Timestamp;
  id?: ID;
  automaticStartTime?: Timestamp;
  bracketType?: BracketType;
  goalTargetComparator?: Comparator;
  goalTargetValue?: string;
  limitMode?: RaceLimitMode;
  limitValue?: number;
  raceType?: RaceType;
}

/** Enforces limits on the amount of allowable Race submissions */
export type RaceLimitMode = "BEST_ALL" | "FIRST_ALL" | "PLAYTIME";

/** Race specific match configuration */
export interface RaceMatchConfig {
  id?: ID;
  bracketType?: BracketType;
  /** Can players report results? */
  playerReportingEnabled?: boolean;
  /** Accepted methods of verification that players can use */
  verificationMethods?: (null | MatchConfigVerificationMethod)[];
  /** Are players required to submit verification of their reported results? */
  verificationRequired?: boolean;
}

/** Race type */
export type RaceType = "GOALS" | "TIMED";

export interface ResetAffectedData {
  affectedSetCount?: number;
  affectedSets?: (null | Set)[];
  affectedPhaseGroupCount?: number;
}

/** A round within a phase group */
export interface Round {
  id?: ID;
  /**
   * If applicable, bestOf is the number of games
   * 									one must win a majority out of to win a set in this round
   */
  bestOf?: number;
  /** Indicates this round's order in the phase group */
  number?: number;
  /** The time that this round is scheduled to start at */
  startAt?: Timestamp;
}

/**
 * The score that led to this standing being awarded. The meaning of this field can
 * vary by standing type and is not used for some standing types.
 */
export interface Score {
  /** The name of this score. e.g. "Kills" or "Stocks" */
  label?: string;
  /** The raw score value */
  value?: number;
  /** Like value, but formatted for race format events. Formatted according to the race config for the front end to use. */
  displayValue?: string;
}

/** A seed for an entrant */
export interface Seed {
  id?: ID;
  /** Map of Participant ID to checked in boolean */
  checkedInParticipants?: JSON;
  entrant?: Entrant;
  groupSeedNum?: number;
  isBye?: boolean;
  phase?: Phase;
  phaseGroup?: PhaseGroup;
  placeholderName?: string;
  placement?: number;
  /** The player(s) associated with this seed's entrant */
  players?: (null | Player)[];
  progressionSeedId?: number;
  /** Source progression information */
  progressionSource?: Progression;
  seedNum?: number;
  /** Entrant's win/loss record for this standing. Scores do not include byes. */
  setRecordWithoutByes?: JSON;
  standings?: (null | Standing)[];
}

export interface SeedConnection {
  pageInfo?: PageInfo;
  nodes?: (null | Seed)[];
}

/** A set */
export interface Set {
  id?: ID;
  /** The time this set was marked as completed */
  completedAt?: Timestamp;
  /** The time this set was created */
  createdAt?: Timestamp;
  displayScore?: string;
  /** Event that this set belongs to. */
  event?: Event;
  /** Full round text of this set. */
  fullRoundText?: string;
  game?: Game;
  games?: (null | Game)[];
  /** Whether this set contains a placeholder entrant */
  hasPlaceholder?: boolean;
  /** The letters that describe a unique identifier within the pool. Eg. F, AT */
  identifier?: string;
  images?: (null | Image)[];
  lPlacement?: number;
  /** Phase group that this Set belongs to. */
  phaseGroup?: PhaseGroup;
  /** The sets that are affected from resetting this set */
  resetAffectedData?: ResetAffectedData;
  /** The round number of the set. Negative numbers are losers bracket */
  round?: number;
  /**
   * Indicates whether the set is in best of or total games mode. This instructs
   * which field is used to figure out how many games are in this set.
   */
  setGamesType?: number;
  /** A possible spot in a set. Use this to get all entrants in a set. Use this for all bracket types (FFA, elimination, etc) */
  slots?: (null | SetSlot)[];
  /** The start time of the Set. If there is no startAt time on the Set, will pull it from phaseGroup rounds configuration. */
  startAt?: Timestamp;
  startedAt?: Timestamp;
  state?: number;
  /** Tournament event station for a set */
  station?: Stations;
  /** Tournament event stream for a set */
  stream?: Streams;
  /** If setGamesType is in total games mode, this defined the number of games in the set. */
  totalGames?: number;
  /** Url of a VOD for this set */
  vodUrl?: string;
  wPlacement?: number;
  winnerId?: number;
}

export interface SetConnection {
  pageInfo?: PageInfo;
  nodes?: (null | Set)[];
}

/** A slot in a set where a seed currently or will eventually exist in order to participate in the set. */
export interface SetSlot {
  id?: ID;
  entrant?: Entrant;
  /** Pairs with prereqType, is the ID of the prereq. */
  prereqId?: string;
  /** Given a set prereq type, defines the placement required in the origin set to end up in this slot. */
  prereqPlacement?: number;
  /** Describes where the entity in this slot comes from. */
  prereqType?: string;
  seed?: Seed;
  /** The index of the slot. Unique per set. */
  slotIndex?: number;
  /** The standing within this set for the seed currently assigned to this slot. */
  standing?: Standing;
}

/** Different sort type configurations used when displaying multiple sets */
export type SetSortType =
  | "NONE"
  | "CALL_ORDER"
  | "MAGIC"
  | "RECENT"
  | "STANDARD"
  | "ROUND";

/** A shop */
export interface Shop {
  id?: ID;
  levels?: ShopLevelConnection;
  messages?: ShopOrderMessageConnection;
  name?: string;
  slug?: string;
  url?: string;
}

/** A shop level */
export interface ShopLevel {
  id?: ID;
  currAmount?: number;
  description?: string;
  goalAmount?: number;
  images?: (null | Image)[];
  name?: string;
}

export interface ShopLevelConnection {
  pageInfo?: PageInfo;
  nodes?: (null | ShopLevel)[];
}

/** The message and player info for a shop order */
export interface ShopOrderMessage {
  id?: ID;
  /** The player's gamertag. Returns null if anonymous message type */
  gamertag?: string;
  /** The order message */
  message?: string;
  /** The player's name. Returns null unless name & tag display is selected */
  name?: string;
  /** The player who left the comment */
  player?: Player;
  /** The total order amount */
  total?: number;
}

export interface ShopOrderMessageConnection {
  pageInfo?: PageInfo;
  nodes?: (null | ShopOrderMessage)[];
}

/** Represents the name of the third-party social service (e.g Twitter) for OAuth */
export type SocialConnectionType =
  | "TWITTER"
  | "TWITCH"
  | "DISCORD"
  | "MIXER"
  | "XBOX";

/** Video Stage */
export interface Stage {
  id?: ID;
  /** Stage name */
  name?: string;
}

/** A standing indicates the placement of something within a container. */
export interface Standing {
  id?: ID;
  /**
   * The containing entity that contextualizes this standing. Event standings, for
   * example, represent an entrant's standing in the entire event vs. Set standings
   * which is an entrant's standing in only a single set within an event.
   */
  container?: StandingContainer;
  /** If the entity this standing is assigned to can be resolved into an entrant, this will provide the entrant. */
  entrant?: Entrant;
  isFinal?: boolean;
  /** Metadata that goes along with this standing. Can take on different forms based on standing group type and settings. */
  metadata?: JSON;
  placement?: number;
  /** The player(s) tied to this standing's entity */
  player?: Player;
  standing?: number;
  stats?: StandingStats;
  totalPoints?: number;
}

export interface StandingConnection {
  pageInfo?: PageInfo;
  nodes?: (null | Standing)[];
}

/** The containing entity that this standing is for */
export type StandingContainer = Tournament | Event | PhaseGroup | Set;

/** Any stats related to this standing. This type is experimental and very likely to change in the future. */
export interface StandingStats {
  score?: Score;
}

/** Stations, such as a stream setup, at an event */
export interface Stations {
  id?: ID;
  canAutoAssign?: boolean;
  clusterNumber?: string;
  clusterPrefix?: number;
  enabled?: boolean;
  identifier?: number;
  numSetups?: number;
  number?: number;
  prefix?: string;
  queue?: JSON;
  queueDepth?: number;
  state?: number;
  updatedAt?: Timestamp;
}

export interface StationsConnection {
  pageInfo?: PageInfo;
  nodes?: (null | Stations)[];
}

/** A Stream object */
export interface Stream {
  id?: ID;
  /** Whether the stream is currently live. May be slightly delayed. */
  isOnline?: boolean;
  /** The name of the stream */
  name?: string;
  /** The name of the external service providing this auth i.e. "twitch" */
  type?: StreamType;
}

/** A Stream queue object */
export interface StreamQueue {
  id?: string;
  /** The sets on the stream */
  sets?: (null | Set)[];
  /** The stream on the queue */
  stream?: Streams;
}

/** Tournament Stream */
export interface Streams {
  id?: ID;
  enabled?: boolean;
  followerCount?: number;
  isOnline?: boolean;
  numSetups?: number;
  parentStreamId?: number;
  streamGame?: string;
  streamId?: string;
  streamLogo?: string;
  streamName?: string;
  streamSource?: StreamSource;
  streamStatus?: string;
  streamType?: number;
  streamTypeId?: number;
}

/** Represents the source of a stream */
export type StreamSource =
  | "TWITCH"
  | "HITBOX"
  | "STREAMME"
  | "MIXER"
  | "YOUTUBE";

/** Represents the type of stream service */
export type StreamType = "TWITCH" | "MIXER" | "YOUTUBE";

/** A set of actions available for a team to take */
export interface TeamActionSet {
  id?: ID;
}

export interface TeamConnection {
  pageInfo?: PageInfo;
  nodes?: (null | Team)[];
}

/** A member of a team */
export interface TeamMember {
  id?: ID;
  isAlternate?: boolean;
  isCaptain?: boolean;
  /** The type of the team member */
  memberType?: TeamMemberType;
  participant?: Participant;
  player?: Player;
  /** The status of the team member */
  status?: TeamMemberStatus;
}

/** Membership status of a team member */
export type TeamMemberStatus =
  | "UNKNOWN"
  | "ACCEPTED"
  | "INVITED"
  | "REQUEST"
  | "ALUM"
  | "HIATUS"
  | "OPEN_SPOT";

/** Membership type of a team member */
export type TeamMemberType = "PLAYER" | "STAFF";

/** Team roster size requirements */
export interface TeamRosterSize {
  maxAlternates?: number;
  maxPlayers?: number;
  minAlternates?: number;
  minPlayers?: number;
}

/** A tournament */
export interface Tournament {
  id?: ID;
  addrState?: string;
  /** Admin-only view of admins for this tournament */
  admins?: (null | User)[];
  city?: string;
  countryCode?: string;
  /** When the tournament was created (unix timestamp) */
  createdAt?: Timestamp;
  currency?: string;
  /** When the tournament ends */
  endAt?: Timestamp;
  /** When does event registration close */
  eventRegistrationClosesAt?: Timestamp;
  events?: (null | Event)[];
  /** True if tournament has at least one offline event */
  hasOfflineEvents?: boolean;
  hasOnlineEvents?: boolean;
  hashtag?: string;
  images?: (null | Image)[];
  /** True if tournament has at least one online event */
  isOnline?: boolean;
  /** Is tournament registration open */
  isRegistrationOpen?: boolean;
  lat?: number;
  links?: TournamentLinks;
  lng?: number;
  mapsPlaceId?: string;
  /** The tournament name */
  name?: string;
  /** Number of attendees including spectators, if public */
  numAttendees?: number;
  /** The user who created the tournament */
  owner?: User;
  /** Paginated, queryable list of participants */
  participants?: ParticipantConnection;
  postalCode?: string;
  primaryContact?: string;
  primaryContactType?: string;
  /** Publishing settings for this tournament */
  publishing?: JSON;
  /** When does registration for the tournament end */
  registrationClosesAt?: Timestamp;
  rules?: string;
  /** The short slug used to form the url */
  shortSlug?: string;
  /** The slug used to form the url */
  slug?: string;
  /** When the tournament Starts */
  startAt?: Timestamp;
  /** State of the tournament, can be ActivityState::CREATED, ActivityState::ACTIVE, or ActivityState::COMPLETED */
  state?: number;
  stations?: StationsConnection;
  streamQueue?: (null | StreamQueue)[];
  streams?: (null | Streams)[];
  /** When is the team creation deadline */
  teamCreationClosesAt?: Timestamp;
  /** Paginated, queryable list of teams */
  teams?: TeamConnection;
  /** The timezone of the tournament */
  timezone?: string;
  /** The type of tournament from TournamentType */
  tournamentType?: number;
  /** When the tournament was last modified (unix timestamp) */
  updatedAt?: Timestamp;
  /** Build Tournament URL */
  url?: string;
  venueAddress?: string;
  venueName?: string;
  /** List of all waves in this tournament */
  waves?: (null | Wave)[];
}

export interface TournamentConnection {
  pageInfo?: PageInfo;
  nodes?: (null | Tournament)[];
}

export interface TournamentLinks {
  facebook?: string;
  discord?: string;
}

export type TournamentPaginationSort =
  | "startAt"
  | "endAt"
  | "eventRegistrationClosesAt"
  | "computedUpdatedAt";

/** A user */
export interface User {
  /** Authorizations to external services (i.e. Twitch, Twitter) */
  authorizations?: (null | ProfileAuthorization)[];
  id?: ID;
  bio?: string;
  /** Public facing user birthday that respects user publishing settings */
  birthday?: string;
  /** Uniquely identifying token for user. Same as the hashed part of the slug */
  discriminator?: string;
  email?: string;
  /** Events this user has competed in */
  events?: EventConnection;
  genderPronoun?: string;
  images?: (null | Image)[];
  /** Leagues this user has competed in */
  leagues?: LeagueConnection;
  /** Public location info for this user */
  location?: Address;
  /** Public facing user name that respects user publishing settings */
  name?: string;
  /** player for user */
  player?: Player;
  slug?: string;
  /** Tournaments this user is organizing or competing in */
  tournaments?: TournamentConnection;
}

/** A videogame */
export interface Videogame {
  id?: ID;
  /** All characters for this videogame */
  characters?: (null | Character)[];
  displayName?: string;
  images?: (null | Image)[];
  name?: string;
  slug?: string;
  /** All stages for this videogame */
  stages?: (null | Stage)[];
}

export interface VideogameConnection {
  pageInfo?: PageInfo;
  nodes?: (null | Videogame)[];
}

/** A wave in a tournament */
export interface Wave {
  id?: ID;
  /** The Wave Identifier */
  identifier?: string;
  /** Unix time the wave is scheduled to start. */
  startAt?: Timestamp;
}
