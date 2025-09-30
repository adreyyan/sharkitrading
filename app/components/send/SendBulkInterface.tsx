'use client';

import React, { useState, useEffect } from 'react';
import { useWalletClient } from 'wagmi';
import { getVerifiedNFTsUserHoldsSmart, VerifiedNFTHolding } from '../../../services/verifiedNFTChecker';
import { useIsMounted } from '../../hooks/useIsMounted';
import SafeImage from '../SafeImage';
import VerifiedBadge from '../VerifiedBadge';
import { isVerifiedNFT, isERC1155NFT } from '../../config/verifiedNFTs';
import { BulkNFTSenderHelper, BULK_NFT_SENDER_ADDRESS } from '../../../lib/bulkNFTSender';
import { ethers } from 'ethers';
import { toast } from 'react-hot-toast';

interface SendBulkInterfaceProps {
  userAddress: string;
}

interface SelectedNFT {
  contractAddress: string;
  tokenId: string;
  name: string;
  image: string;
  collectionName: string;
  quantity: number;
  availableQuantity?: number;
  standard?: 'ERC721' | 'ERC1155';
}

interface SendState {
  verifiedHoldings: VerifiedNFTHolding[];
  selectedNFTs: SelectedNFT[];
  isLoading: boolean;
  error: string | null;
  sendMode: 'one' | 'many';
  recipientAddress: string;
  recipientAddresses: string;
  searchQuery: string;
  isSending: boolean;
  sendingStatus: string;
  approvedNFTs: Set<string>;
  checkingApprovals: boolean;
  approvingNFTs: Set<string>;
  quantitySelectNFT: SelectedNFT | null;
}

export default function SendBulkInterface({ userAddress }: SendBulkInterfaceProps) {
  const isMounted = useIsMounted();
  const { data: walletClient } = useWalletClient();
  const DEBUG_LOGS = process.env.NEXT_PUBLIC_DEBUG_LOGS === '1';
  const debug = (...args: any[]) => { if (DEBUG_LOGS) console.log(...args); };
  
  const [state, setState] = useState<SendState>({
    verifiedHoldings: [],
    selectedNFTs: [],
    isLoading: false,
    error: null,
    sendMode: 'one',
    recipientAddress: '',
    recipientAddresses: '',
    searchQuery: '',
    isSending: false,
    sendingStatus: '',
    approvedNFTs: new Set(),
    checkingApprovals: false,
    approvingNFTs: new Set(),
    quantitySelectNFT: null
  });

  const [tempQuantity, setTempQuantity] = useState<number | string>(1);

  // Load user's verified NFT holdings directly
  useEffect(() => {
    if (!userAddress || !isMounted) return;

    const loadUserVerifiedNFTs = async () => {
      setState(prev => ({ ...prev, isLoading: true }));
      
      try {
        debug('🚀 Loading verified NFTs for:', userAddress);
        const verifiedHoldings = await getVerifiedNFTsUserHoldsSmart(userAddress);
        debug('🎯 Verified holdings found:', verifiedHoldings);
        
        setState(prev => ({
          ...prev,
          verifiedHoldings,
          isLoading: false
        }));
        
        if (verifiedHoldings.length > 0) {
          debug(`✅ User holds ${verifiedHoldings.length} verified collections!`);
          verifiedHoldings.forEach(holding => {
            debug(`✅ ${holding.collectionName}: ${holding.tokens.length} tokens`);
          });
        } else {
          debug('❌ No verified NFTs found for this wallet');
        }
      } catch (error) {
        console.error('❌ Error loading verified NFTs:', error);
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to load verified NFTs'
        }));
      }
    };

    loadUserVerifiedNFTs();
  }, [userAddress, isMounted]);

  const handleNFTSelect = (contractAddress: string, tokenId: string, name: string, image: string, collectionName: string, availableQuantity: number = 1) => {
    const isERC1155 = isERC1155NFT(contractAddress);
    
    setState(prev => {
      const isSelected = prev.selectedNFTs.some(selected => 
        selected.contractAddress === contractAddress && selected.tokenId === tokenId
      );

      if (isSelected) {
        // Remove from selection
        return {
          ...prev,
          selectedNFTs: prev.selectedNFTs.filter(selected => 
            !(selected.contractAddress === contractAddress && selected.tokenId === tokenId)
          )
        };
      } else {
        // For ERC1155 with multiple copies, show quantity selector
        if (isERC1155 && availableQuantity > 1) {
          const newNFT: SelectedNFT = {
            contractAddress,
            tokenId,
            name,
            image,
            collectionName,
            quantity: 1,
            availableQuantity,
            standard: 'ERC1155'
          };
          setTempQuantity(1);
          return {
            ...prev,
            quantitySelectNFT: newNFT
          };
        }

        // Add to selection with quantity 1
        const newNFT: SelectedNFT = {
          contractAddress,
          tokenId,
          name,
          image,
          collectionName,
          quantity: 1,
          availableQuantity,
          standard: isERC1155 ? 'ERC1155' : 'ERC721'
        };
        return {
          ...prev,
          selectedNFTs: [...prev.selectedNFTs, newNFT]
        };
      }
    });
  };

  const handleSendModeSelect = (mode: 'one' | 'many') => {
    setState(prev => ({ 
      ...prev, 
      sendMode: mode,
      // Clear addresses when switching modes
      recipientAddress: '',
      recipientAddresses: ''
    }));
  };

  const handleAddressChange = (value: string) => {
    if (state.sendMode === 'one') {
      setState(prev => ({ ...prev, recipientAddress: value }));
    } else {
      setState(prev => ({ ...prev, recipientAddresses: value }));
    }
  };

  const handleQuantitySelect = (quantity: number) => {
    if (!state.quantitySelectNFT) return;

    const nftWithQuantity = {
      ...state.quantitySelectNFT,
      quantity
    };

    setState(prev => ({
      ...prev,
      selectedNFTs: [...prev.selectedNFTs, nftWithQuantity],
      quantitySelectNFT: null
    }));
  };

  const closeQuantityModal = () => {
    setState(prev => ({ ...prev, quantitySelectNFT: null }));
    setTempQuantity(1);
  };

  const isNFTSelected = (contractAddress: string, tokenId: string) => {
    return state.selectedNFTs.some(selected => 
      selected.contractAddress === contractAddress && selected.tokenId === tokenId
    );
  };

  const parseAddresses = () => {
    return state.recipientAddresses
      .split('\n')
      .map(addr => addr.trim())
      .filter(addr => addr.length > 0);
  };

  const canProceed = () => {
    if (state.selectedNFTs.length === 0) return false;
    
    if (state.sendMode === 'one') {
      return state.recipientAddress.trim().length > 0;
    } else {
      const addresses = parseAddresses();
      return addresses.length > 0 && addresses.every(addr => addr.startsWith('0x'));
    }
  };

  // Check NFT approvals
  const checkNFTApprovals = async () => {
    if (!walletClient || state.selectedNFTs.length === 0) return;

    setState(prev => ({ ...prev, checkingApprovals: true }));

    try {
      const provider = new ethers.BrowserProvider(walletClient as any);
      const signer = await provider.getSigner();
      const bulkSender = new BulkNFTSenderHelper(signer);

      debug('🔍 Checking approvals for NFTs:', state.selectedNFTs.map(nft => ({
        name: nft.name,
        contract: nft.contractAddress,
        tokenId: nft.tokenId,
        isValidAddress: ethers.isAddress(nft.contractAddress)
      })));

      const approvedSet = new Set<string>();

      for (const nft of state.selectedNFTs) {
        const nftKey = `${nft.contractAddress}-${nft.tokenId}`;
        
        try {
          // Validate contract address
          if (!nft.contractAddress || !ethers.isAddress(nft.contractAddress)) {
            console.warn(`Invalid contract address for ${nftKey}:`, nft.contractAddress);
            continue;
          }

          if (isERC1155NFT(nft.contractAddress)) {
            // Skip BulkSender check for now, use direct contract check
            try {
              const nftContract = new ethers.Contract(
                nft.contractAddress,
                ['function isApprovedForAll(address owner, address operator) external view returns (bool)'],
                signer
              );
              
              const approvedForAll = await nftContract.isApprovedForAll(userAddress, BULK_NFT_SENDER_ADDRESS);
              
              if (approvedForAll) {
                approvedSet.add(nftKey);
              }
            } catch (error) {
              console.warn(`Direct ERC1155 approval check failed for ${nft.collectionName}:`, error);
              // Assume not approved if check fails - this is expected for invalid contracts
            }
          } else {
            // Check ERC721 approval - prioritize setApprovalForAll (collection-level)
            try {
              const nftContract = new ethers.Contract(
                nft.contractAddress,
                ['function isApprovedForAll(address owner, address operator) external view returns (bool)'],
                signer
              );
              
              const approvedForAll = await nftContract.isApprovedForAll(userAddress, BULK_NFT_SENDER_ADDRESS);
              
              if (approvedForAll) {
                approvedSet.add(nftKey);
              }
            } catch (directError) {
              console.warn(`Direct ERC721 approval check failed for ${nft.name}:`, directError);
              // Assume not approved if check fails - this is expected for invalid contracts
            }
          }
        } catch (error) {
          console.error(`Error checking approval for ${nftKey}:`, error);
        }
      }

      setState(prev => ({ ...prev, approvedNFTs: approvedSet, checkingApprovals: false }));
    } catch (error) {
      console.error('Error checking approvals:', error);
      setState(prev => ({ ...prev, checkingApprovals: false }));
      toast.error('Failed to check NFT approvals');
    }
  };

  // Approve NFT for bulk sender
  const approveNFT = async (nft: SelectedNFT) => {
    if (!walletClient) return;

    const nftKey = `${nft.contractAddress}-${nft.tokenId}`;
    
    // Prevent double approval
    if (state.approvedNFTs.has(nftKey) || state.approvingNFTs.has(nftKey)) {
      return;
    }

    try {
      // Set approving state
      setState(prev => ({
        ...prev,
        approvingNFTs: new Set([...prev.approvingNFTs, nftKey])
      }));

      const provider = new ethers.BrowserProvider(walletClient as any);
      const signer = await provider.getSigner();

      if (isERC1155NFT(nft.contractAddress)) {
        // ERC1155 approval
        const erc1155Contract = new ethers.Contract(
          nft.contractAddress,
          ['function setApprovalForAll(address operator, bool approved) external'],
          signer
        );
        
        const tx = await erc1155Contract.setApprovalForAll(BULK_NFT_SENDER_ADDRESS, true);
        toast.loading(`Approving ${nft.collectionName}...`, { id: `approve-${nft.contractAddress}` });
        await tx.wait();
        toast.success(`${nft.collectionName} approved!`, { id: `approve-${nft.contractAddress}` });
      } else {
        // ERC721 approval - use setApprovalForAll for entire collection
        const erc721Contract = new ethers.Contract(
          nft.contractAddress,
          ['function setApprovalForAll(address operator, bool approved) external'],
          signer
        );
        
        const tx = await erc721Contract.setApprovalForAll(BULK_NFT_SENDER_ADDRESS, true);
        toast.loading(`Approving ${nft.collectionName} collection...`, { id: `approve-${nft.contractAddress}` });
        await tx.wait();
        toast.success(`${nft.collectionName} collection approved!`, { id: `approve-${nft.contractAddress}` });
      }

      // Update approval state - for collection-level approval, mark all NFTs from this collection as approved
      setState(prev => {
        const newApprovedNFTs = new Set([...prev.approvedNFTs]);
        const newApprovingNFTs = new Set([...prev.approvingNFTs]);
        
        // Mark all NFTs from this collection as approved
        prev.selectedNFTs.forEach(selectedNFT => {
          if (selectedNFT.contractAddress === nft.contractAddress) {
            const selectedNftKey = `${selectedNFT.contractAddress}-${selectedNFT.tokenId}`;
            newApprovedNFTs.add(selectedNftKey);
            newApprovingNFTs.delete(selectedNftKey);
          }
        });
        
        return {
          ...prev,
          approvedNFTs: newApprovedNFTs,
          approvingNFTs: newApprovingNFTs
        };
      });
      
      // Also refresh all approvals to be sure
      setTimeout(() => checkNFTApprovals(), 1000);
    } catch (error) {
      console.error('Approval error:', error);
      toast.error('Failed to approve NFT');
      
      // Remove from approving state on error
      setState(prev => ({
        ...prev,
        approvingNFTs: new Set([...prev.approvingNFTs].filter(key => key !== nftKey))
      }));
    }
  };

  // Approve all selected collections that are not yet approved
  const approveAllSelected = async () => {
    if (!walletClient) return;
    const unapprovedCollections = new Set<string>();
    state.selectedNFTs.forEach(nft => {
      const nftKey = `${nft.contractAddress}-${nft.tokenId}`;
      if (!state.approvedNFTs.has(nftKey) && !state.approvingNFTs.has(nftKey)) {
        unapprovedCollections.add(nft.contractAddress);
      }
    });
    for (const contractAddress of unapprovedCollections) {
      const rep = state.selectedNFTs.find(n => n.contractAddress === contractAddress);
      if (rep) {
        // eslint-disable-next-line no-await-in-loop
        await approveNFT(rep);
      }
    }
  };

  // Send NFTs using bulk contract
  const sendNFTs = async () => {
    if (!walletClient || !canProceed()) return;

    setState(prev => ({ ...prev, isSending: true, sendingStatus: 'Preparing transaction...' }));

    try {
      const provider = new ethers.BrowserProvider(walletClient as any);
      const signer = await provider.getSigner();
      const bulkSender = new BulkNFTSenderHelper(signer);
      const txHashes: string[] = [];

      // Separate ERC721 and ERC1155 NFTs
      const erc721NFTs = state.selectedNFTs.filter(nft => !isERC1155NFT(nft.contractAddress));
      const erc1155NFTs = state.selectedNFTs.filter(nft => isERC1155NFT(nft.contractAddress));

      const recipients = state.sendMode === 'one' 
        ? [state.recipientAddress.trim()]
        : parseAddresses();

      debug('🚀 Sending NFTs:', {
        erc721Count: erc721NFTs.length,
        erc1155Count: erc1155NFTs.length,
        sendMode: state.sendMode,
        recipients: recipients,
        selectedNFTs: state.selectedNFTs.map(nft => ({
          contract: nft.contractAddress,
          tokenId: nft.tokenId,
          name: nft.name
        }))
      });

      // Validate inputs
      if (recipients.length === 0) {
        throw new Error('No valid recipients provided');
      }

      if (state.sendMode === 'many' && recipients.length !== state.selectedNFTs.length) {
        throw new Error(`Recipient count (${recipients.length}) must match NFT count (${state.selectedNFTs.length}) for "Send to Many" mode`);
      }

      setState(prev => ({ ...prev, sendingStatus: 'Sending NFTs...' }));

      // Send ERC721 NFTs
      if (erc721NFTs.length > 0) {
        const contracts = erc721NFTs.map(nft => nft.contractAddress);
        const tokenIds = erc721NFTs.map(nft => nft.tokenId);
        
        debug('📤 Sending ERC721 NFTs:', { contracts, tokenIds, recipients: recipients });

        if (state.sendMode === 'one') {
          setState(prev => ({ ...prev, sendingStatus: 'Sending ERC721 NFTs to one recipient...' }));
          const tx = await bulkSender.bulkSendERC721ToOne({
            nftContracts: contracts,
            tokenIds: tokenIds,
            recipient: recipients[0]
          });
          debug('✅ ERC721 to one transaction hash:', tx.hash);
          txHashes.push(tx.hash);
          toast.loading('Submitting ERC721 transaction...', { id: `tx-${tx.hash}` });
          
          setState(prev => ({ ...prev, sendingStatus: 'Waiting for confirmation...' }));
          await tx.wait();
          toast.success('ERC721 confirmed', { id: `tx-${tx.hash}` });
        } else {
          setState(prev => ({ ...prev, sendingStatus: 'Sending ERC721 NFTs to multiple recipients...' }));
          
          // For "send to many", each NFT goes to a different recipient
          const erc721Recipients = recipients.slice(0, erc721NFTs.length);
          
          if (erc721Recipients.length !== erc721NFTs.length) {
            throw new Error(`Not enough recipients for ERC721 NFTs. Need ${erc721NFTs.length}, got ${erc721Recipients.length}`);
          }

          const tx = await bulkSender.bulkSendERC721ToMany({
            nftContracts: contracts,
            tokenIds: tokenIds,
            recipients: erc721Recipients
          });
          debug('✅ ERC721 to many transaction hash:', tx.hash);
          txHashes.push(tx.hash);
          toast.loading('Submitting ERC721 transaction...', { id: `tx-${tx.hash}` });
          
          setState(prev => ({ ...prev, sendingStatus: 'Waiting for confirmation...' }));
          await tx.wait();
          toast.success('ERC721 confirmed', { id: `tx-${tx.hash}` });
        }
      }

      // Send ERC1155 NFTs
      if (erc1155NFTs.length > 0) {
        const contracts = erc1155NFTs.map(nft => nft.contractAddress);
        const tokenIds = erc1155NFTs.map(nft => nft.tokenId);
        const amounts = erc1155NFTs.map(nft => nft.quantity.toString());
        
        debug('📤 Sending ERC1155 NFTs:', { contracts, tokenIds, amounts });

        if (state.sendMode === 'one') {
          setState(prev => ({ ...prev, sendingStatus: 'Sending ERC1155 NFTs to one recipient...' }));
          const tx = await bulkSender.bulkSendERC1155ToOne({
            nftContracts: contracts,
            tokenIds: tokenIds,
            amounts: amounts,
            recipient: recipients[0]
          });
          debug('✅ ERC1155 to one transaction hash:', tx.hash);
          txHashes.push(tx.hash);
          toast.loading('Submitting ERC1155 transaction...', { id: `tx-${tx.hash}` });
          
          setState(prev => ({ ...prev, sendingStatus: 'Waiting for confirmation...' }));
          await tx.wait();
          toast.success('ERC1155 confirmed', { id: `tx-${tx.hash}` });
        } else {
          setState(prev => ({ ...prev, sendingStatus: 'Sending ERC1155 NFTs to multiple recipients...' }));
          
          // For "send to many", use remaining recipients after ERC721s
          const erc1155Recipients = recipients.slice(erc721NFTs.length, erc721NFTs.length + erc1155NFTs.length);
          
          if (erc1155Recipients.length !== erc1155NFTs.length) {
            throw new Error(`Not enough recipients for ERC1155 NFTs. Need ${erc1155NFTs.length}, got ${erc1155Recipients.length}`);
          }

          const tx = await bulkSender.bulkSendERC1155ToMany({
            nftContracts: contracts,
            tokenIds: tokenIds,
            amounts: amounts,
            recipients: erc1155Recipients
          });
          debug('✅ ERC1155 to many transaction hash:', tx.hash);
          txHashes.push(tx.hash);
          toast.loading('Submitting ERC1155 transaction...', { id: `tx-${tx.hash}` });
          
          setState(prev => ({ ...prev, sendingStatus: 'Waiting for confirmation...' }));
          await tx.wait();
          toast.success('ERC1155 confirmed', { id: `tx-${tx.hash}` });
        }
      }

      // Success!
      toast.custom((t) => (
        <div className="rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 p-4 w-[380px] shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold">Send complete</div>
              <div className="text-sm text-zinc-400 mt-0.5">Successfully sent {state.selectedNFTs.length} NFT{state.selectedNFTs.length > 1 ? 's' : ''}.</div>
            </div>
            <button className="text-zinc-400 hover:text-zinc-200" onClick={() => toast.dismiss(t.id)}>✕</button>
          </div>
          {txHashes.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {txHashes.map((hash) => (
                <a
                  key={hash}
                  href={`https://testnet.monadexplorer.com/tx/${hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-xs text-blue-400 hover:text-blue-300 truncate"
                >
                  View transaction: {hash}
                </a>
              ))}
            </div>
          )}
        </div>
      ), { duration: 8000, position: 'bottom-right' });
      
      // Reset the form
      setState(prev => ({
        ...prev,
        selectedNFTs: [],
        recipientAddress: '',
        recipientAddresses: '',
        isSending: false,
        sendingStatus: '',
        approvedNFTs: new Set()
      }));

    } catch (error: any) {
      console.error('❌ Send error:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to send NFTs';
      
      if (error.code === 'CALL_EXCEPTION') {
        if (error.reason) {
          errorMessage = `Transaction reverted: ${error.reason}`;
        } else {
          errorMessage = 'Transaction reverted - please check NFT approvals and ownership';
        }
      } else if (error.message?.includes('missing revert data')) {
        errorMessage = 'Transaction failed - NFTs may not be properly approved or you may not own them';
      } else if (error.message?.includes('insufficient funds') || error.message?.includes('insufficient balance')) {
        errorMessage = 'Insufficient balance for gas fees';
      } else if (error.message?.includes('execution reverted')) {
        errorMessage = 'Transaction reverted - check approvals and contract addresses';
      } else if (error.message?.includes('user rejected')) {
        errorMessage = 'Transaction cancelled by user';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage, { position: 'bottom-right' });
      setState(prev => ({ ...prev, isSending: false, sendingStatus: '' }));
    }
  };

  // Check approvals when selected NFTs change
  useEffect(() => {
    if (state.selectedNFTs.length > 0 && walletClient) {
      checkNFTApprovals();
    }
  }, [state.selectedNFTs.length, walletClient]);

  // Filter collections based on search query
  const filteredHoldings = state.verifiedHoldings.filter(holding => 
    holding.collectionName.toLowerCase().includes(state.searchQuery.toLowerCase())
  );

  if (!isMounted) return null;

  return (
    <div className="space-y-6">
      {/* Main Container - Glass Card Style like Swap */}
      <div className="glass-card rounded-lg overflow-hidden">
        {/* Header Section */}
        <div className="glass-light px-4 py-3 border-b border-white/20">
        <div className="flex items-center justify-between mb-4">
            <span className="font-semibold text-sm text-gray-900 dark:text-white">Your inventory</span>
          
            <div className="flex items-center gap-3">
              {/* Select All and Reset buttons */}
          {state.verifiedHoldings.length > 0 && (
                <>
                  <button
                    onClick={() => {
                      // Select all NFTs logic
                      const allNFTs: SelectedNFT[] = [];
                      state.verifiedHoldings.forEach(holding => {
                        holding.tokens.forEach(token => {
                          allNFTs.push({
                            contractAddress: holding.collectionId,
                            tokenId: token.tokenId,
                            name: token.name || `#${token.tokenId}`,
                            image: token.image || '/placeholder.svg',
                            collectionName: holding.collectionName,
                            quantity: parseInt(token.tokenCount) || 1
                          });
                        });
                      });
                      setState(prev => ({ ...prev, selectedNFTs: allNFTs }));
                    }}
                    className="px-3 py-1.5 rounded-lg border border-zinc-600 text-zinc-300 hover:bg-zinc-800 transition-colors text-sm font-medium"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => setState(prev => ({ ...prev, selectedNFTs: [] }))}
                    className="px-3 py-1.5 rounded-lg border border-zinc-600 text-zinc-300 hover:bg-zinc-800 transition-colors text-sm font-medium"
                  >
                    Reset
                  </button>
                </>
              )}
            </div>
        </div>
        
          {/* Send Mode Toggle */}
          <div className="flex gap-3 mb-3">
          <button
            onClick={() => handleSendModeSelect('one')}
              className={`px-4 py-2 rounded-lg font-medium transition-all text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
              state.sendMode === 'one'
                  ? 'bg-blue-600 text-white'
                : 'bg-zinc-900/50 text-zinc-300 ring-1 ring-zinc-800 hover:bg-zinc-800'
            }`}
          >
            Send to One
          </button>
          <button
            onClick={() => handleSendModeSelect('many')}
              className={`px-4 py-2 rounded-lg font-medium transition-all text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${
              state.sendMode === 'many'
                  ? 'bg-blue-600 text-white'
                : 'bg-zinc-900/50 text-zinc-300 ring-1 ring-zinc-800 hover:bg-zinc-800'
            }`}
          >
            Send to Many
          </button>
        </div>

          {/* Search Collection */}
          <div className="relative max-w-sm">
              <input
                type="text"
              placeholder="Search collection"
              value={state.searchQuery}
              onChange={(e) => setState(prev => ({ ...prev, searchQuery: e.target.value }))}
              className="w-full bg-zinc-900/70 border border-zinc-800 rounded-xl px-4 py-2 pl-10 text-white placeholder-zinc-500 focus:ring-2 focus:ring-blue-500/30 focus:border-zinc-800 transition-colors text-sm"
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
              <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0z" />
              </svg>
            </div>
          </div>
      </div>

        {/* Scrollable NFT Collections Display */}
        <div className="h-[700px] overflow-y-auto thin-scrollbar">
        {state.isLoading && (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-400"></div>
              <p className="text-zinc-400 text-sm">Loading your NFTs...</p>
          </div>
        )}

        {state.error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 m-6">
            <p className="text-red-400">{state.error}</p>
          </div>
        )}

        {!state.isLoading && state.verifiedHoldings.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <div className="text-center">
                <h3 className="text-white font-medium mb-1">No NFTs Found</h3>
                <p className="text-zinc-400 text-sm">You don't have any verified NFTs in your wallet.</p>
              </div>
          </div>
        )}

          {!state.isLoading && filteredHoldings.length > 0 && (
            <div className="p-6 space-y-8">
              {filteredHoldings.map((holding) => {
              if (!holding.tokens || holding.tokens.length === 0) return null;

              return (
                <div key={holding.collectionId} id={`collection-${holding.collectionId}`} className="space-y-4">
                    {/* Collection Header - Matching Swap Feature */}
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8">
                        {holding.collectionImage ? (
                          <SafeImage 
                            src={holding.collectionImage} 
                            alt={holding.collectionName}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : null}
                        <div className={`w-full h-full bg-green-500 rounded-full flex items-center justify-center ${holding.collectionImage ? 'hidden' : ''}`}>
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-base">
                            {holding.collectionName}
                          </h3>
                          <VerifiedBadge />
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                          {(() => {
                            if (holding.collectionFloorPrice && holding.collectionFloorPrice > 0) {
                              return `Floor: ${holding.collectionFloorPrice.toFixed(0)} Mon`;
                            } else {
                              return 'No floor price';
                            }
                          })()}
                        </div>
                      </div>
                  </div>

                    {/* NFT Grid - mobile tiles 20% larger (5 cols instead of 6) */}
                    <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-14 gap-2">
                    {holding.tokens.map((token) => {
                      const isSelected = isNFTSelected(holding.collectionId, token.tokenId);
                      const availableQuantity = parseInt(token.tokenCount || "1");
                      
                      return (
                          <div
                          key={`${holding.collectionId}-${token.tokenId}`}
                          onClick={() => handleNFTSelect(
                            holding.collectionId, 
                            token.tokenId, 
                            token.name || `#${token.tokenId}`, 
                            token.image || '/placeholder.svg',
                            holding.collectionName,
                            availableQuantity
                          )}
                            className={`relative rounded p-1 transition-all duration-200 cursor-pointer hover:scale-105 ${
                              isSelected 
                                ? 'bg-blue-500/20 border border-blue-500/50 shadow-lg' 
                                : 'bg-white/10 dark:bg-gray-800/20 border border-white/20 dark:border-gray-600/30 hover:border-blue-400/50 hover:bg-white/20 dark:hover:bg-gray-800/30'
                            }`}
                          >
                            <div className="aspect-square bg-gray-200 dark:bg-gray-700 rounded overflow-hidden relative">
                              <SafeImage
                                src={token.image || '/placeholder.svg'}
                                alt={token.name || `NFT #${token.tokenId}`}
                                className="w-full h-full object-cover"
                              />
                              {parseInt(token.tokenCount || "1") > 1 && (
                                <div className="absolute top-1 left-1 bg-purple-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                                  ×{token.tokenCount}
                                </div>
                              )}
                          </div>
                            <div className="text-xs font-medium text-gray-900 dark:text-white text-center truncate mt-0.5">
                              #{token.tokenId}
                            </div>
                          </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
      </div>

      {/* Address Input Section */}
      {state.selectedNFTs.length > 0 && (
        <div className="glass-card rounded-lg p-4 space-y-3">
          <div className="space-y-4">
            {state.sendMode === 'one' ? (
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Recipient Address</label>
                <input
                  type="text"
                  value={state.recipientAddress}
                  onChange={(e) => handleAddressChange(e.target.value)}
                  placeholder="0x... (EVM wallet address)"
                  className="w-full bg-zinc-900/70 border border-zinc-700 rounded-md h-10 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-zinc-700 transition-colors"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Wallet addresses one per line</label>
                <textarea
                  value={state.recipientAddresses}
                  onChange={(e) => handleAddressChange(e.target.value)}
                  placeholder="0x...&#10;0x...&#10;0x..."
                  rows={3}
                  className="w-full bg-zinc-900/70 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-zinc-700 transition-colors resize-none"
                />
              </div>
            )}

            {/* Send Button */}
          <button
              className={`w-full font-semibold py-2.5 px-4 rounded-md transition-colors text-sm ${
                canProceed() && !state.isSending
                  ? 'bg-blue-600 hover:bg-blue-500 text-white border border-blue-500/40' 
                : 'bg-zinc-900/60 border border-zinc-800 text-zinc-500 cursor-not-allowed'
            }`}
              disabled={!canProceed() || state.isSending}
              onClick={sendNFTs}
            >
              {state.isSending
                ? state.sendingStatus || 'Sending...'
                : canProceed() 
                  ? `Confirm (${state.selectedNFTs.length})`
                  : 'Enter recipient address(es) to continue'
              }
            </button>

            {/* NFT Approvals - compact only */}
            {state.selectedNFTs.length > 0 && (
              <>
                {/* Approval List by Collection (compact banner above) */}
                <div className="space-y-3 mb-4">
                  {(() => {
                    // Group NFTs by collection to show approvals per collection
                    const collectionGroups = new Map<string, SelectedNFT[]>();
                    state.selectedNFTs.forEach(nft => {
                      if (!collectionGroups.has(nft.contractAddress)) {
                        collectionGroups.set(nft.contractAddress, []);
                      }
                      collectionGroups.get(nft.contractAddress)!.push(nft);
                    });

                    // Compute unapproved count to render compact banner
                    const entries = Array.from(collectionGroups.entries());
                    const unapproved = entries.filter(([_, nfts]) =>
                      !nfts.some(n => state.approvedNFTs.has(`${n.contractAddress}-${n.tokenId}`))
                    );

                    return (
                      <>
                        <div className={`mb-2 px-3 py-2 rounded-lg border flex items-center justify-between ${
                          unapproved.length > 0
                            ? 'bg-zinc-900/70 border-zinc-800 text-zinc-300 ring-1 ring-amber-400/20'
                            : 'bg-zinc-900/60 border-zinc-800 text-zinc-300 ring-1 ring-emerald-400/20'
                        }`}>
                          <div className="flex items-center gap-2 text-xs">
                            {unapproved.length > 0 ? (
                              <>
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.366-.756 1.42-.756 1.786 0l7.451 15.385A1 1 0 0116.451 20H3.549a1 1 0 01-.894-1.516L10.106 3.1zM11 14a1 1 0 10-2 0 1 1 0 002 0zm-1-2a1 1 0 01-1-1V7a1 1 0 112 0v4a1 1 0 01-1 1z" clipRule="evenodd"/></svg>
                                <span>{unapproved.length} collection{unapproved.length>1?'s':''} need approval</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-7.364 7.364a1 1 0 01-1.414 0L3.293 10.435a1 1 0 011.414-1.414l3.222 3.222 6.657-6.657a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                                <span>All selected NFTs are approved</span>
                              </>
                            )}
                          </div>
                          {unapproved.length > 0 && (
                            <button onClick={approveAllSelected} className="px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-100">Approve All</button>
                          )}
                        </div>

                        {entries.map(([contractAddress, nfts]) => {
                      // Check if any NFT from this collection is approved (since it's collection-level approval)
                      const isCollectionApproved = nfts.some(nft => {
                        const nftKey = `${nft.contractAddress}-${nft.tokenId}`;
                        return state.approvedNFTs.has(nftKey);
                      });
                      
                      // Check if any NFT from this collection is being approved
                      const isCollectionApproving = nfts.some(nft => {
                        const nftKey = `${nft.contractAddress}-${nft.tokenId}`;
                        return state.approvingNFTs.has(nftKey);
                      });

                      const representativeNft = nfts[0];

                          return (
                        <div key={contractAddress} className="flex items-center justify-between p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg hover:bg-zinc-900/70 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700">
                              <img 
                                src={representativeNft.image || '/placeholder.svg'} 
                                alt={representativeNft.collectionName || 'NFT'} 
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <p className="font-medium text-white text-sm">
                                {representativeNft.collectionName || 'NFT Collection'}
                              </p>
                              <p className="text-xs text-zinc-400">
                                {contractAddress.slice(0, 8)}...{contractAddress.slice(-6)} • {nfts.length} NFT{nfts.length > 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2">
                              {isCollectionApproved ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                  Approved
                                </span>
                              ) : (
                                <button
                                  onClick={() => approveNFT(representativeNft)}
                                  disabled={isCollectionApproving || state.checkingApprovals}
                                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                                    isCollectionApproving || state.checkingApprovals
                                      ? 'bg-zinc-700 text-zinc-300 cursor-not-allowed'
                                      : 'bg-blue-600 hover:bg-blue-500 text-white'
                                  }`}
                                >
                                  {isCollectionApproving ? (
                                    <div className="flex items-center gap-2">
                                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                      Approving...
                                    </div>
                                  ) : state.checkingApprovals ? (
                                    <div className="flex items-center gap-2">
                                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                      Checking...
                                    </div>
                                  ) : (
                                    'Approve'
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                          );
                        })}
                      </>
                    );
                  })()}
                </div>

                {/* Removed big gradient Quick Action to keep UI minimal */}
              </>
            )}

            {/* Selected NFTs Count */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3">
              <p className="text-zinc-300 text-sm">
                {state.selectedNFTs.length} NFT{state.selectedNFTs.length > 1 ? 's' : ''} selected for {state.sendMode === 'one' ? 'single recipient' : 'multiple recipients'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quantity Selection Modal (same UX as swap) */}
      {state.quantitySelectNFT && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="glass-card rounded-2xl p-4 w-full max-w-xs shadow-2xl">
            <h3 className="text-sm font-semibold text-white mb-4 text-center">
              Select Quantity
            </h3>
            <div className="flex flex-col items-center gap-4 mb-6">
              <div className="w-24 h-24 rounded-lg overflow-hidden shadow-lg">
                <img
                  src={state.quantitySelectNFT.image || '/placeholder.svg'}
                  alt={state.quantitySelectNFT.name || 'NFT'}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-center">
                <p className="font-medium text-white">
                  {state.quantitySelectNFT.name || `NFT #${state.quantitySelectNFT.tokenId}`}
                </p>
                <p className="text-sm text-gray-300">
                  Available: {state.quantitySelectNFT.availableQuantity || 1}
                </p>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={() => {
                    const current = typeof tempQuantity === 'number' ? tempQuantity : parseInt(tempQuantity.toString()) || 1;
                    setTempQuantity(Math.max(1, current - 1));
                  }}
                  disabled={typeof tempQuantity === 'number' ? tempQuantity <= 1 : parseInt(tempQuantity.toString()) <= 1}
                  className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white flex items-center justify-center text-sm font-bold disabled:opacity-50"
                >
                  −
                </button>
                <input
                  type="number"
                  value={tempQuantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    const maxAvail = state.quantitySelectNFT?.availableQuantity || 1;
                    if (!isNaN(val)) {
                      setTempQuantity(Math.min(Math.max(1, val), maxAvail));
                    } else {
                      setTempQuantity('');
                    }
                  }}
                  min={1}
                  max={state.quantitySelectNFT.availableQuantity || 1}
                  className="w-20 text-center bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg py-1 text-gray-900 dark:text-gray-100"
                />
                <button
                  onClick={() => {
                    const current = typeof tempQuantity === 'number' ? tempQuantity : parseInt(tempQuantity.toString()) || 1;
                    const maxAvail = state.quantitySelectNFT?.availableQuantity || 1;
                    setTempQuantity(Math.min(maxAvail, current + 1));
                  }}
                  disabled={typeof tempQuantity === 'number' ? tempQuantity >= (state.quantitySelectNFT?.availableQuantity || 1) : false}
                  className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white flex items-center justify-center text-sm font-bold disabled:opacity-50"
                >
                  +
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={closeQuantityModal}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const qty = typeof tempQuantity === 'number' ? tempQuantity : parseInt(tempQuantity.toString()) || 1;
                  handleQuantitySelect(qty);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}