import { State } from "../../../backends/pages/tournament";
import React, { useContext } from "react";

export const TournamentContext = React.createContext<State["tournament"]>({
  tournamentSlug: "",
});

export const TournamentProvider = TournamentContext.Provider;
export const useTournament = () => useContext(TournamentContext);
