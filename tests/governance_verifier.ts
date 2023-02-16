import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { GovernanceVerifier } from "../target/types/governance_verifier";

describe("governance_verifier", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.GovernanceVerifier as Program<GovernanceVerifier>;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });
});
