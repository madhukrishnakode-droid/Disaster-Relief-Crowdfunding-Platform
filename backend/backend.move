module admin_address::backend {
    use std::signer;
    use std::vector;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;

    /// Error codes
    const E_NOT_OWNER: u64 = 1;
    const E_CAMPAIGN_NOT_FOUND: u64 = 2;
    const E_CAMPAIGN_COMPLETED: u64 = 3;
    const E_INSUFFICIENT_FUNDS: u64 = 4;
    const E_GOAL_NOT_REACHED: u64 = 5;
    const E_ALREADY_WITHDRAWN: u64 = 6;

    /// Campaign struct
    struct Campaign has store, drop, copy {
        owner: address,
        title: vector<u8>,
        description: vector<u8>,
        goal: u64,          // in octas (1 APT = 100,000,000 octas)
        donated: u64,       // in octas
        completed: bool,
        withdrawn: bool,
    }

    /// Resource to store campaign funds and data
    struct CampaignStore has key {
        campaigns: vector<Campaign>,
        next_id: u64,
    }

    /// Resource to hold funds for each campaign
    struct CampaignFunds has key {
        funds: coin::Coin<AptosCoin>,
    }

    /// Initialize the campaign store (call this once after deploying)
    public entry fun initialize(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        
        if (!exists<CampaignStore>(admin_addr)) {
            move_to(admin, CampaignStore {
                campaigns: vector::empty(),
                next_id: 0,
            });
        };

        if (!exists<CampaignFunds>(admin_addr)) {
            move_to(admin, CampaignFunds {
                funds: coin::zero<AptosCoin>(),
            });
        };
    }

    /// Create a new disaster relief campaign
    public entry fun create_campaign(
        creator: &signer,
        title: vector<u8>,
        description: vector<u8>,
        goal: u64,
    ) acquires CampaignStore {
        let creator_addr = signer::address_of(creator);
        
        // Get the campaign store from admin address
        let store = borrow_global_mut<CampaignStore>(@admin_address);
        
        let campaign = Campaign {
            owner: creator_addr,
            title,
            description,
            goal,
            donated: 0,
            completed: false,
            withdrawn: false,
        };
        
        vector::push_back(&mut store.campaigns, campaign);
        store.next_id = store.next_id + 1;
    }

    /// Donate to a campaign
    public entry fun donate(
        donor: &signer,
        campaign_index: u64,
        amount: u64,
    ) acquires CampaignStore, CampaignFunds {
        let store = borrow_global_mut<CampaignStore>(@admin_address);
        
        assert!(campaign_index < vector::length(&store.campaigns), E_CAMPAIGN_NOT_FOUND);
        
        let campaign = vector::borrow_mut(&mut store.campaigns, campaign_index);
        assert!(!campaign.completed, E_CAMPAIGN_COMPLETED);
        
        // Transfer APT from donor to the contract's fund storage
        let donation = coin::withdraw<AptosCoin>(donor, amount);
        let funds_store = borrow_global_mut<CampaignFunds>(@admin_address);
        coin::merge(&mut funds_store.funds, donation);
        
        // Update campaign
        campaign.donated = campaign.donated + amount;
        
        // Check if goal is reached
        if (campaign.donated >= campaign.goal) {
            campaign.completed = true;
        };
    }

    /// Withdraw funds from completed campaign (only owner can withdraw)
    public entry fun withdraw(
        owner: &signer,
        campaign_index: u64,
    ) acquires CampaignStore, CampaignFunds {
        let owner_addr = signer::address_of(owner);
        let store = borrow_global_mut<CampaignStore>(@admin_address);
        
        assert!(campaign_index < vector::length(&store.campaigns), E_CAMPAIGN_NOT_FOUND);
        
        let campaign = vector::borrow_mut(&mut store.campaigns, campaign_index);
        assert!(campaign.owner == owner_addr, E_NOT_OWNER);
        assert!(campaign.completed, E_GOAL_NOT_REACHED);
        assert!(!campaign.withdrawn, E_ALREADY_WITHDRAWN);
        
        // Extract funds from the contract's fund storage
        let funds_store = borrow_global_mut<CampaignFunds>(@admin_address);
        let withdrawal_amount = campaign.donated;
        let coins_to_withdraw = coin::extract(&mut funds_store.funds, withdrawal_amount);
        
        // Transfer funds to campaign owner
        coin::deposit(owner_addr, coins_to_withdraw);
        
        // Mark as withdrawn
        campaign.withdrawn = true;
    }

    /// Emergency withdraw by admin (in case of issues)
    public entry fun admin_withdraw(
        admin: &signer,
        campaign_index: u64,
    ) acquires CampaignStore, CampaignFunds {
        let admin_addr = signer::address_of(admin);
        assert!(admin_addr == @admin_address, E_NOT_OWNER);
        
        let store = borrow_global_mut<CampaignStore>(@admin_address);
        assert!(campaign_index < vector::length(&store.campaigns), E_CAMPAIGN_NOT_FOUND);
        
        let campaign = vector::borrow_mut(&mut store.campaigns, campaign_index);
        assert!(!campaign.withdrawn, E_ALREADY_WITHDRAWN);
        
        // Extract funds from the contract's fund storage
        let funds_store = borrow_global_mut<CampaignFunds>(@admin_address);
        let withdrawal_amount = campaign.donated;
        let coins_to_withdraw = coin::extract(&mut funds_store.funds, withdrawal_amount);
        
        // Transfer funds back to campaign owner
        coin::deposit(campaign.owner, coins_to_withdraw);
        
        campaign.withdrawn = true;
    }

    // ============ VIEW FUNCTIONS ============

    #[view]
    public fun get_campaign_count(): u64 acquires CampaignStore {
        if (!exists<CampaignStore>(@admin_address)) {
            return 0
        };
        
        let store = borrow_global<CampaignStore>(@admin_address);
        vector::length(&store.campaigns)
    }

    #[view]
    public fun get_campaign(index: u64): (address, vector<u8>, vector<u8>, u64, u64, bool, bool) acquires CampaignStore {
        let store = borrow_global<CampaignStore>(@admin_address);
        assert!(index < vector::length(&store.campaigns), E_CAMPAIGN_NOT_FOUND);
        
        let campaign = vector::borrow(&store.campaigns, index);
        (
            campaign.owner,
            campaign.title,
            campaign.description,
            campaign.goal,
            campaign.donated,
            campaign.completed,
            campaign.withdrawn
        )
    }

    #[view]
    public fun get_all_campaigns(): vector<Campaign> acquires CampaignStore {
        if (!exists<CampaignStore>(@admin_address)) {
            return vector::empty()
        };
        
        let store = borrow_global<CampaignStore>(@admin_address);
        store.campaigns
    }

    #[view]
    public fun get_campaigns_by_owner(owner: address): vector<u64> acquires CampaignStore {
        if (!exists<CampaignStore>(@admin_address)) {
            return vector::empty()
        };
        
        let store = borrow_global<CampaignStore>(@admin_address);
        let result = vector::empty<u64>();
        let i = 0;
        
        while (i < vector::length(&store.campaigns)) {
            let campaign = vector::borrow(&store.campaigns, i);
            if (campaign.owner == owner) {
                vector::push_back(&mut result, i);
            };
            i = i + 1;
        };
        
        result
    }
}