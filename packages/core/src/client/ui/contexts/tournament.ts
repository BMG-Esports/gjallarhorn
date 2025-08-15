import { State } from "../../../backends/pages/tournament";
import React, { useContext } from "react";

export const SggTournamentContext = React.createContext<State["sggTournament"]>(
  {
    tournamentSlug: "",
  }
);

export const CmTournamentContext = React.createContext<State["cmTournament"]>({
  tournamentId: "",
});

export const SggTournamentProvider = SggTournamentContext.Provider;
export const useSggTournament = () => useContext(SggTournamentContext);

export const CmTournamentProvider = CmTournamentContext.Provider;
export const useCmTournament = () => useContext(CmTournamentContext);
