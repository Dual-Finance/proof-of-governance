import * as anchor from '@coral-xyz/anchor';
import { Program, Provider } from '@project-serum/anchor';
import { GovernanceVerifier } from '../target/types/governance_verifier';
//import { createMint, createTokenAccount, toBytes32Array } from './utils/utils';
import { PublicKey } from '@solana/web3.js';
import { createMint, createTokenAccount } from './utils/utils';

describe('anchor_verifier', () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const provider: Provider = anchor.AnchorProvider.env();
  const program = anchor.workspace.GovernanceVerifier as Program<GovernanceVerifier>;
  const stateKeypair = anchor.web3.Keypair.generate();
  const amount = new anchor.BN(1_000_000);
  const eligibilityStart = new anchor.BN(0);
  const eligibilityEnd = new anchor.BN(2_000_000_000);

  it('Governance Verify', async () => {
    const proposal = new PublicKey('6ws4bv5CefMwVXi54fMc6c7VU1RrT3QxYYeGzQMiVp4Z');
    const voteRecord = new PublicKey('BsGL7UwBT9ojUTMgtYh6foZrbWVnJvBBpsprdjkswVA1');
    const governance = new PublicKey('Dg31swH4qLRzqgFsDZb3eME1QvwgAXnzA1Awtwgh3oc4');
    const recipient = new PublicKey('2qLWeNrV7QkHQvKBoEvXrKeLqEB2ZhscZd4ds7X2JUhn');

    const configureTx = await program.methods.configure(
      amount,
      eligibilityStart,
      eligibilityEnd
    )
      .accounts({
        payer: provider.publicKey,
        state: stateKeypair.publicKey,
        governance: governance,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([stateKeypair])
      .rpc({ skipPreflight: true });

    console.log('Configure signature', configureTx);

    const mint = await createMint(provider, provider.publicKey);

    // Do not actually need to mint to the account because that is handled in the airdropper.
    const recipientTokenAccount = await createTokenAccount(provider, mint, recipient);

    const verifyTx = await program.methods.verify(
      amount,
      Buffer.alloc(0),
    )
      .accounts({
        authority: provider.publicKey,
        verifierState: stateKeypair.publicKey,
        recipient: recipientTokenAccount,
        governance,
        proposal,
        voteRecord,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc({ skipPreflight: true });
    console.log('Verification signature', verifyTx);
   });
});