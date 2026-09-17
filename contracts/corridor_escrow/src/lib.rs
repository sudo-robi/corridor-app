#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env, Symbol, Vec,
};

// ─── Data Types ────────────────────────────────────────────────────────────

#[derive(Clone)]
#[contracttype]
pub struct Agent {
    pub address: Address,
    pub collateral: i128,
    pub reputation: u64,
    pub active_corridors: u32,
    pub max_corridors: u32,
    pub supported_side: Symbol,
    pub rate_bps: u32,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[contracttype]
pub enum CorridorStatus {
    Created,
    Accepted,
    LocalPaid,
    RemotePaid,
    Completed,
    Timeout,
}

#[derive(Clone)]
#[contracttype]
pub struct Corridor {
    pub id: u64,
    pub sender: Address,
    pub receiver_phone: Symbol,
    pub amount_send: i128,
    pub amount_receive: i128,
    pub status: CorridorStatus,
    pub agent: Option<Address>,
    pub created_at: u64,
    pub expires_at: u64,
    pub completed_at: Option<u64>,
    pub fee_bps: u32,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[contracterror]
pub enum Error {
    AlreadyRegistered = 1,
    NotRegistered = 2,
    InsufficientCollateral = 3,
    CorridorNotFound = 4,
    CorridorExpired = 5,
    CorridorNotOpen = 6,
    Unauthorized = 7,
    MaxCorridorsReached = 8,
    InvalidStatus = 9,
    TimeoutNotReached = 10,
    AgentAlreadyAssigned = 11,
}

// ─── Storage ───────────────────────────────────────────────────────────────

const AGENT_ADDRESSES: Symbol = symbol_short!("ag_addrs");
const ADMIN: Symbol = symbol_short!("admin");
const NEXT_ID: Symbol = symbol_short!("next_id");
const TOTAL_VOLUME: Symbol = symbol_short!("tot_vol");
const TOTAL_CORRIDORS: Symbol = symbol_short!("tot_crd");

fn agent_key(addr: &Address) -> (Symbol, Address) {
    (symbol_short!("agent"), addr.clone())
}

fn corridor_key(id: u64) -> (Symbol, u64) {
    (symbol_short!("corridor"), id)
}

// ─── Contract ──────────────────────────────────────────────────────────────

#[contract]
pub struct CorridorEscrow;

#[contractimpl]
impl CorridorEscrow {
    pub fn initialize(env: Env, admin: Address) {
        env.storage().instance().set(&ADMIN, &admin);
        env.storage().instance().set(&NEXT_ID, &1u64);
        env.storage().instance().set(&TOTAL_VOLUME, &0i128);
        env.storage().instance().set(&TOTAL_CORRIDORS, &0u64);
        env.storage()
            .persistent()
            .set(&AGENT_ADDRESSES, &Vec::<Address>::new(&env));
    }

    pub fn get_admin(env: Env) -> Address {
        env.storage().instance().get(&ADMIN).unwrap()
    }

    // ── Agent Management ────────────────────────────────────────────────

    pub fn register_agent(
        env: Env,
        agent: Address,
        collateral: i128,
        max_corridors: u32,
        supported_side: Symbol,
        rate_bps: u32,
    ) -> Result<(), Error> {
        agent.require_auth();

        if env.storage().persistent().has(&agent_key(&agent)) {
            return Err(Error::AlreadyRegistered);
        }
        if collateral < 100_000_000 {
            return Err(Error::InsufficientCollateral);
        }

        let data = Agent {
            address: agent.clone(),
            collateral,
            reputation: 100,
            active_corridors: 0,
            max_corridors,
            supported_side,
            rate_bps,
        };

        env.storage().persistent().set(&agent_key(&agent), &data);

        let mut addrs: Vec<Address> = env
            .storage()
            .persistent()
            .get(&AGENT_ADDRESSES)
            .unwrap_or(Vec::new(&env));
        addrs.push_back(agent);
        env.storage().persistent().set(&AGENT_ADDRESSES, &addrs);

        Ok(())
    }

    pub fn update_agent_config(
        env: Env,
        agent: Address,
        max_corridors: Option<u32>,
        rate_bps: Option<u32>,
    ) -> Result<(), Error> {
        agent.require_auth();

        let mut data: Agent = env
            .storage()
            .persistent()
            .get(&agent_key(&agent))
            .ok_or(Error::NotRegistered)?;

        if let Some(mc) = max_corridors {
            data.max_corridors = mc;
        }
        if let Some(r) = rate_bps {
            data.rate_bps = r;
        }

        env.storage().persistent().set(&agent_key(&agent), &data);
        Ok(())
    }

    pub fn add_collateral(env: Env, agent: Address, amount: i128) -> Result<(), Error> {
        agent.require_auth();

        let mut data: Agent = env
            .storage()
            .persistent()
            .get(&agent_key(&agent))
            .ok_or(Error::NotRegistered)?;

        data.collateral += amount;
        env.storage().persistent().set(&agent_key(&agent), &data);
        Ok(())
    }

    pub fn withdraw_collateral(env: Env, agent: Address, amount: i128) -> Result<(), Error> {
        agent.require_auth();

        let mut data: Agent = env
            .storage()
            .persistent()
            .get(&agent_key(&agent))
            .ok_or(Error::NotRegistered)?;

        if data.active_corridors > 0 || amount > data.collateral {
            return Err(Error::InsufficientCollateral);
        }

        data.collateral -= amount;
        env.storage().persistent().set(&agent_key(&agent), &data);
        Ok(())
    }

    pub fn get_agent(env: Env, agent: Address) -> Option<Agent> {
        env.storage().persistent().get(&agent_key(&agent))
    }

    pub fn get_agent_count(env: Env) -> u32 {
        let addrs: Vec<Address> = env
            .storage()
            .persistent()
            .get(&AGENT_ADDRESSES)
            .unwrap_or(Vec::new(&env));
        addrs.len()
    }

    pub fn find_best_agent(env: Env, side: Symbol) -> Option<Agent> {
        let addrs: Vec<Address> = env
            .storage()
            .persistent()
            .get(&AGENT_ADDRESSES)
            .unwrap_or(Vec::new(&env));

        let mut best: Option<Agent> = None;
        for i in 0..addrs.len() {
            let addr = addrs.get(i).unwrap();
            if let Some(agent) = env
                .storage()
                .persistent()
                .get::<_, Agent>(&agent_key(&addr))
            {
                if agent.supported_side != side && agent.supported_side != symbol_short!("both") {
                    continue;
                }
                if agent.active_corridors >= agent.max_corridors {
                    continue;
                }
                match &best {
                    None => best = Some(agent),
                    Some(b) => {
                        if agent.reputation > b.reputation
                            || (agent.reputation == b.reputation && agent.rate_bps < b.rate_bps)
                        {
                            best = Some(agent);
                        }
                    }
                }
            }
        }
        best
    }

    // ── Corridor Flow ───────────────────────────────────────────────────

    pub fn create_corridor(
        env: Env,
        sender: Address,
        receiver_phone: Symbol,
        amount_send: i128,
        amount_receive: i128,
        timeout_ledgers: u32,
    ) -> Result<u64, Error> {
        sender.require_auth();

        let id: u64 = env.storage().instance().get(&NEXT_ID).unwrap_or(1);
        let now = env.ledger().timestamp();
        let timeout_secs = (timeout_ledgers as u64) * 5;

        let corridor = Corridor {
            id,
            sender,
            receiver_phone,
            amount_send,
            amount_receive,
            status: CorridorStatus::Created,
            agent: None,
            created_at: now,
            expires_at: now + timeout_secs,
            completed_at: None,
            fee_bps: 0,
        };

        env.storage().persistent().set(&corridor_key(id), &corridor);
        env.storage().instance().set(&NEXT_ID, &(id + 1));

        let total: u64 = env.storage().instance().get(&TOTAL_CORRIDORS).unwrap_or(0);
        env.storage().instance().set(&TOTAL_CORRIDORS, &(total + 1));

        Ok(id)
    }

    pub fn accept_corridor(env: Env, agent: Address, corridor_id: u64) -> Result<(), Error> {
        agent.require_auth();

        let mut corridor: Corridor = env
            .storage()
            .persistent()
            .get(&corridor_key(corridor_id))
            .ok_or(Error::CorridorNotFound)?;

        let mut agent_data: Agent = env
            .storage()
            .persistent()
            .get(&agent_key(&agent))
            .ok_or(Error::NotRegistered)?;

        if corridor.status != CorridorStatus::Created {
            return Err(Error::CorridorNotOpen);
        }
        if corridor.agent.is_some() {
            return Err(Error::AgentAlreadyAssigned);
        }
        let now = env.ledger().timestamp();
        if now > corridor.expires_at {
            return Err(Error::CorridorExpired);
        }
        if agent_data.active_corridors >= agent_data.max_corridors {
            return Err(Error::MaxCorridorsReached);
        }

        corridor.status = CorridorStatus::Accepted;
        corridor.agent = Some(agent.clone());
        corridor.fee_bps = agent_data.rate_bps;
        env.storage()
            .persistent()
            .set(&corridor_key(corridor_id), &corridor);

        agent_data.active_corridors += 1;
        env.storage()
            .persistent()
            .set(&agent_key(&agent), &agent_data);

        Ok(())
    }

    pub fn confirm_local_payment(env: Env, sender: Address, corridor_id: u64) -> Result<(), Error> {
        sender.require_auth();

        let mut corridor: Corridor = env
            .storage()
            .persistent()
            .get(&corridor_key(corridor_id))
            .ok_or(Error::CorridorNotFound)?;

        if corridor.sender != sender {
            return Err(Error::Unauthorized);
        }
        if corridor.status != CorridorStatus::Accepted {
            return Err(Error::InvalidStatus);
        }

        corridor.status = CorridorStatus::LocalPaid;
        env.storage()
            .persistent()
            .set(&corridor_key(corridor_id), &corridor);
        Ok(())
    }

    pub fn confirm_remote_payment(env: Env, agent: Address, corridor_id: u64) -> Result<(), Error> {
        agent.require_auth();

        let mut corridor: Corridor = env
            .storage()
            .persistent()
            .get(&corridor_key(corridor_id))
            .ok_or(Error::CorridorNotFound)?;

        if corridor.agent != Some(agent.clone()) {
            return Err(Error::Unauthorized);
        }
        if corridor.status != CorridorStatus::LocalPaid {
            return Err(Error::InvalidStatus);
        }

        corridor.status = CorridorStatus::RemotePaid;
        env.storage()
            .persistent()
            .set(&corridor_key(corridor_id), &corridor);
        Ok(())
    }

    pub fn settle_corridor(env: Env, corridor_id: u64) -> Result<(), Error> {
        let mut corridor: Corridor = env
            .storage()
            .persistent()
            .get(&corridor_key(corridor_id))
            .ok_or(Error::CorridorNotFound)?;

        if corridor.status != CorridorStatus::RemotePaid {
            return Err(Error::InvalidStatus);
        }

        let now = env.ledger().timestamp();
        corridor.status = CorridorStatus::Completed;
        corridor.completed_at = Some(now);
        env.storage()
            .persistent()
            .set(&corridor_key(corridor_id), &corridor);

        if let Some(agent_addr) = corridor.agent {
            let mut agent_data: Agent = env
                .storage()
                .persistent()
                .get(&agent_key(&agent_addr))
                .ok_or(Error::NotRegistered)?;

            agent_data.reputation = agent_data.reputation.saturating_add(1);
            agent_data.active_corridors = agent_data.active_corridors.saturating_sub(1);
            env.storage()
                .persistent()
                .set(&agent_key(&agent_addr), &agent_data);

            let vol: i128 = env.storage().instance().get(&TOTAL_VOLUME).unwrap_or(0);
            env.storage()
                .instance()
                .set(&TOTAL_VOLUME, &(vol + corridor.amount_send));
        }

        Ok(())
    }

    pub fn timeout_refund(env: Env, corridor_id: u64) -> Result<(), Error> {
        let mut corridor: Corridor = env
            .storage()
            .persistent()
            .get(&corridor_key(corridor_id))
            .ok_or(Error::CorridorNotFound)?;

        let now = env.ledger().timestamp();
        if now <= corridor.expires_at {
            return Err(Error::TimeoutNotReached);
        }
        if corridor.status == CorridorStatus::Completed {
            return Err(Error::InvalidStatus);
        }

        let old_status = corridor.status;
        corridor.status = CorridorStatus::Timeout;
        corridor.completed_at = Some(now);
        env.storage()
            .persistent()
            .set(&corridor_key(corridor_id), &corridor);

        if let Some(agent_addr) = corridor.agent {
            let mut agent_data: Agent = env
                .storage()
                .persistent()
                .get(&agent_key(&agent_addr))
                .ok_or(Error::NotRegistered)?;

            if old_status == CorridorStatus::Accepted || old_status == CorridorStatus::LocalPaid {
                agent_data.reputation = agent_data.reputation.saturating_sub(5);
            }
            agent_data.active_corridors = agent_data.active_corridors.saturating_sub(1);
            env.storage()
                .persistent()
                .set(&agent_key(&agent_addr), &agent_data);
        }

        Ok(())
    }

    // ── Queries ─────────────────────────────────────────────────────────

    pub fn get_corridor(env: Env, corridor_id: u64) -> Option<Corridor> {
        env.storage().persistent().get(&corridor_key(corridor_id))
    }

    pub fn get_total_volume(env: Env) -> i128 {
        env.storage().instance().get(&TOTAL_VOLUME).unwrap_or(0)
    }

    pub fn get_total_corridors(env: Env) -> u64 {
        env.storage().instance().get(&TOTAL_CORRIDORS).unwrap_or(0)
    }

    pub fn get_next_id(env: Env) -> u64 {
        env.storage().instance().get(&NEXT_ID).unwrap_or(1)
    }

    pub fn compute_quote(amount_send: i128, rate_bps: u32, exchange_rate: i128) -> i128 {
        let fee = (amount_send * (rate_bps as i128)) / 10_000;
        let after_fee = amount_send - fee;
        (after_fee * exchange_rate) / 10_000
    }
}

// ─── Tests ─────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::testutils::Ledger;

    fn setup() -> (Env, Address, CorridorEscrowClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let contract = env.register_contract(None, CorridorEscrow);
        let client = CorridorEscrowClient::new(&env, &contract);
        let admin = Address::generate(&env);
        client.initialize(&admin);
        (env, admin, client)
    }

    fn register_agent(
        env: &Env,
        client: &CorridorEscrowClient,
        side: Symbol,
        rate: u32,
    ) -> Address {
        let agent = Address::generate(env);
        client.register_agent(&agent, &500_000_000, &5, &side, &rate);
        agent
    }

    #[test]
    fn test_initialize() {
        let (env, admin, client) = setup();
        assert_eq!(client.get_admin(), admin);
        assert_eq!(client.get_next_id(), 1);
        assert_eq!(client.get_total_volume(), 0);
        assert_eq!(client.get_total_corridors(), 0);
        assert_eq!(client.get_agent_count(), 0);
    }

    #[test]
    fn test_register_agent() {
        let (env, _, client) = setup();
        let agent = Address::generate(&env);
        let r = client.try_register_agent(&agent, &500_000_000, &5, &symbol_short!("ngn"), &100);
        assert_eq!(r, Ok(Ok(())));

        let data = client.get_agent(&agent).unwrap();
        assert_eq!(data.collateral, 500_000_000);
        assert_eq!(data.reputation, 100);
        assert_eq!(data.max_corridors, 5);
        assert_eq!(client.get_agent_count(), 1);
    }

    #[test]
    fn test_register_duplicate() {
        let (env, _, client) = setup();
        let a = Address::generate(&env);
        client.register_agent(&a, &500_000_000, &5, &symbol_short!("ngn"), &100);
        let r = client.try_register_agent(&a, &500_000_000, &5, &symbol_short!("ngn"), &100);
        assert_eq!(r, Err(Ok(Error::AlreadyRegistered)));
    }

    #[test]
    fn test_register_insufficient_collateral() {
        let (env, _, client) = setup();
        let a = Address::generate(&env);
        let r = client.try_register_agent(&a, &50_000_000, &5, &symbol_short!("ngn"), &100);
        assert_eq!(r, Err(Ok(Error::InsufficientCollateral)));
    }

    #[test]
    fn test_register_minimum_collateral() {
        let (env, _, client) = setup();
        let a = Address::generate(&env);
        let r = client.try_register_agent(&a, &100_000_000, &1, &symbol_short!("both"), &50);
        assert_eq!(r, Ok(Ok(())));
    }

    #[test]
    fn test_update_config() {
        let (env, _, client) = setup();
        let a = Address::generate(&env);
        client.register_agent(&a, &500_000_000, &5, &symbol_short!("ngn"), &100);
        client.update_agent_config(&a, &Some(10), &Some(200));
        let d = client.get_agent(&a).unwrap();
        assert_eq!(d.max_corridors, 10);
        assert_eq!(d.rate_bps, 200);
    }

    #[test]
    fn test_add_withdraw_collateral() {
        let (env, _, client) = setup();
        let a = Address::generate(&env);
        client.register_agent(&a, &100_000_000, &5, &symbol_short!("both"), &100);
        client.add_collateral(&a, &200_000_000);
        assert_eq!(client.get_agent(&a).unwrap().collateral, 300_000_000);
        client.withdraw_collateral(&a, &100_000_000);
        assert_eq!(client.get_agent(&a).unwrap().collateral, 200_000_000);
    }

    #[test]
    fn test_withdraw_too_much() {
        let (env, _, client) = setup();
        let a = Address::generate(&env);
        client.register_agent(&a, &100_000_000, &5, &symbol_short!("both"), &100);
        let r = client.try_withdraw_collateral(&a, &200_000_000);
        assert_eq!(r, Err(Ok(Error::InsufficientCollateral)));
    }

    #[test]
    fn test_find_best_empty() {
        let (env, _, client) = setup();
        assert!(client.find_best_agent(&symbol_short!("ngn")).is_none());
    }

    #[test]
    fn test_find_best_by_reputation() {
        let (env, _, client) = setup();
        let a1 = Address::generate(&env);
        let a2 = Address::generate(&env);
        client.register_agent(&a1, &500_000_000, &5, &symbol_short!("ngn"), &100);
        client.register_agent(&a2, &500_000_000, &5, &symbol_short!("ngn"), &100);

        let sender = Address::generate(&env);
        client.create_corridor(&sender, &symbol_short!("phone1"), &1_000_000, &50_000, &600);
        client.accept_corridor(&a2, &1);
        client.confirm_local_payment(&sender, &1);
        client.confirm_remote_payment(&a2, &1);
        client.settle_corridor(&1);

        let best = client.find_best_agent(&symbol_short!("ngn")).unwrap();
        assert_eq!(best.address, a2);
        assert_eq!(best.reputation, 101);
    }

    #[test]
    fn test_find_best_filters_full() {
        let (env, _, client) = setup();
        let a1 = Address::generate(&env);
        let a2 = Address::generate(&env);
        client.register_agent(&a1, &500_000_000, &1, &symbol_short!("ngn"), &100);
        client.register_agent(&a2, &500_000_000, &1, &symbol_short!("ngn"), &100);

        let sender = Address::generate(&env);
        client.create_corridor(&sender, &symbol_short!("phone1"), &1_000_000, &50_000, &600);
        client.accept_corridor(&a1, &1);

        let best = client.find_best_agent(&symbol_short!("ngn")).unwrap();
        assert_eq!(best.address, a2);
    }

    #[test]
    fn test_create_corridor() {
        let (env, _, client) = setup();
        let sender = Address::generate(&env);
        let id =
            client.create_corridor(&sender, &symbol_short!("phone1"), &1_000_000, &50_000, &600);
        assert_eq!(id, 1);
        assert_eq!(client.get_next_id(), 2);
        assert_eq!(client.get_total_corridors(), 1);

        let c = client.get_corridor(&1).unwrap();
        assert_eq!(c.status, CorridorStatus::Created);
        assert_eq!(c.amount_send, 1_000_000);
    }

    #[test]
    fn test_full_happy_path() {
        let (env, _, client) = setup();
        let agent = register_agent(&env, &client, symbol_short!("both"), 100);
        let sender = Address::generate(&env);

        let id =
            client.create_corridor(&sender, &symbol_short!("phone1"), &1_000_000, &50_000, &600);
        assert_eq!(
            client.get_corridor(&id).unwrap().status,
            CorridorStatus::Created
        );

        client.accept_corridor(&agent, &id);
        assert_eq!(
            client.get_corridor(&id).unwrap().status,
            CorridorStatus::Accepted
        );

        client.confirm_local_payment(&sender, &id);
        assert_eq!(
            client.get_corridor(&id).unwrap().status,
            CorridorStatus::LocalPaid
        );

        client.confirm_remote_payment(&agent, &id);
        assert_eq!(
            client.get_corridor(&id).unwrap().status,
            CorridorStatus::RemotePaid
        );

        client.settle_corridor(&id);
        let f = client.get_corridor(&id).unwrap();
        assert_eq!(f.status, CorridorStatus::Completed);
        assert!(f.completed_at.is_some());
        assert_eq!(client.get_total_volume(), 1_000_000);

        let ad = client.get_agent(&agent).unwrap();
        assert_eq!(ad.reputation, 101);
        assert_eq!(ad.active_corridors, 0);
    }

    #[test]
    fn test_accept_not_open() {
        let (env, _, client) = setup();
        let a1 = register_agent(&env, &client, symbol_short!("ngn"), 100);
        let a2 = register_agent(&env, &client, symbol_short!("ngn"), 100);
        let sender = Address::generate(&env);
        client.create_corridor(&sender, &symbol_short!("phone1"), &1_000_000, &50_000, &600);
        client.accept_corridor(&a1, &1);
        let r = client.try_accept_corridor(&a2, &1);
        assert_eq!(r, Err(Ok(Error::CorridorNotOpen)));
    }

    #[test]
    fn test_accept_max_capacity() {
        let (env, _, client) = setup();
        let a = Address::generate(&env);
        client.register_agent(&a, &500_000_000, &1, &symbol_short!("ngn"), &100);
        let sender = Address::generate(&env);
        client.create_corridor(&sender, &symbol_short!("phone1"), &1_000_000, &50_000, &600);
        client.create_corridor(&sender, &symbol_short!("phone2"), &1_000_000, &50_000, &600);
        client.accept_corridor(&a, &1);
        let r = client.try_accept_corridor(&a, &2);
        assert_eq!(r, Err(Ok(Error::MaxCorridorsReached)));
    }

    #[test]
    fn test_confirm_wrong_sender() {
        let (env, _, client) = setup();
        let a = register_agent(&env, &client, symbol_short!("ngn"), 100);
        let sender = Address::generate(&env);
        let other = Address::generate(&env);
        client.create_corridor(&sender, &symbol_short!("phone1"), &1_000_000, &50_000, &600);
        client.accept_corridor(&a, &1);
        let r = client.try_confirm_local_payment(&other, &1);
        assert_eq!(r, Err(Ok(Error::Unauthorized)));
    }

    #[test]
    fn test_confirm_wrong_agent() {
        let (env, _, client) = setup();
        let a = register_agent(&env, &client, symbol_short!("ngn"), 100);
        let wrong = Address::generate(&env);
        let sender = Address::generate(&env);
        client.create_corridor(&sender, &symbol_short!("phone1"), &1_000_000, &50_000, &600);
        client.accept_corridor(&a, &1);
        client.confirm_local_payment(&sender, &1);
        let r = client.try_confirm_remote_payment(&wrong, &1);
        assert_eq!(r, Err(Ok(Error::Unauthorized)));
    }

    #[test]
    fn test_timeout_not_yet() {
        let (env, _, client) = setup();
        let sender = Address::generate(&env);
        client.create_corridor(&sender, &symbol_short!("phone1"), &1_000_000, &50_000, &600);
        let r = client.try_timeout_refund(&1);
        assert_eq!(r, Err(Ok(Error::TimeoutNotReached)));
    }

    #[test]
    fn test_timeout_after_expiry() {
        let (env, _, client) = setup();
        let a = register_agent(&env, &client, symbol_short!("ngn"), 100);
        let sender = Address::generate(&env);
        client.create_corridor(&sender, &symbol_short!("phone1"), &1_000_000, &50_000, &2);
        client.accept_corridor(&a, &1);

        env.ledger().with_mut(|l| l.timestamp = l.timestamp + 11);
        client.timeout_refund(&1);

        let c = client.get_corridor(&1).unwrap();
        assert_eq!(c.status, CorridorStatus::Timeout);
        assert_eq!(client.get_agent(&a).unwrap().reputation, 95);
        assert_eq!(client.get_agent(&a).unwrap().active_corridors, 0);
    }

    #[test]
    fn test_timeout_on_completed() {
        let (env, _, client) = setup();
        let a = register_agent(&env, &client, symbol_short!("both"), 100);
        let sender = Address::generate(&env);
        client.create_corridor(&sender, &symbol_short!("phone1"), &1_000_000, &50_000, &2);
        client.accept_corridor(&a, &1);
        client.confirm_local_payment(&sender, &1);
        client.confirm_remote_payment(&a, &1);
        client.settle_corridor(&1);

        env.ledger().with_mut(|l| l.timestamp = l.timestamp + 11);
        let r = client.try_timeout_refund(&1);
        assert_eq!(r, Err(Ok(Error::InvalidStatus)));
    }

    #[test]
    fn test_compute_quote() {
        assert_eq!(CorridorEscrow::compute_quote(1_000_000, 100, 500), 49_500);
        assert_eq!(CorridorEscrow::compute_quote(1_000_000, 0, 500), 50_000);
    }

    #[test]
    fn test_get_nonexistent() {
        let (env, _, client) = setup();
        assert!(client.get_corridor(&999).is_none());
    }

    #[test]
    fn test_accept_nonexistent() {
        let (env, _, client) = setup();
        let a = register_agent(&env, &client, symbol_short!("ngn"), 100);
        let r = client.try_accept_corridor(&a, &999);
        assert_eq!(r, Err(Ok(Error::CorridorNotFound)));
    }

    // ── Extended tests ─────────────────────────────────────────────────

    #[test]
    fn test_register_zero_collateral() {
        let (env, _, client) = setup();
        let a = Address::generate(&env);
        let r = client.try_register_agent(&a, &0, &5, &symbol_short!("both"), &100);
        assert_eq!(r, Err(Ok(Error::InsufficientCollateral)));
    }

    #[test]
    fn test_register_99_million_collateral() {
        let (env, _, client) = setup();
        let a = Address::generate(&env);
        let r = client.try_register_agent(&a, &99_999_999, &5, &symbol_short!("both"), &100);
        assert_eq!(r, Err(Ok(Error::InsufficientCollateral)));
    }

    #[test]
    fn test_find_best_by_lower_rate() {
        let (env, _, client) = setup();
        let a1 = Address::generate(&env);
        let a2 = Address::generate(&env);
        client.register_agent(&a1, &500_000_000, &5, &symbol_short!("both"), &200);
        client.register_agent(&a2, &500_000_000, &5, &symbol_short!("both"), &50);

        let best = client.find_best_agent(&symbol_short!("ngn")).unwrap();
        assert_eq!(best.address, a2);
        assert_eq!(best.rate_bps, 50);
    }

    #[test]
    fn test_find_best_filters_wrong_side() {
        let (env, _, client) = setup();
        let a1 = Address::generate(&env);
        client.register_agent(&a1, &500_000_000, &5, &symbol_short!("bob"), &100);

        let best = client.find_best_agent(&symbol_short!("ngn"));
        assert!(best.is_none());
    }

    #[test]
    fn test_find_best_both_side_matches_any() {
        let (env, _, client) = setup();
        let a = Address::generate(&env);
        client.register_agent(&a, &500_000_000, &5, &symbol_short!("both"), &100);

        assert!(client.find_best_agent(&symbol_short!("ngn")).is_some());
        assert!(client.find_best_agent(&symbol_short!("bob")).is_some());
    }

    #[test]
    fn test_multiple_corridors_same_agent() {
        let (env, _, client) = setup();
        let a = register_agent(&env, &client, symbol_short!("both"), 100);
        let sender = Address::generate(&env);

        let id1 = client.create_corridor(&sender, &symbol_short!("p1"), &1_000_000, &50_000, &600);
        let id2 = client.create_corridor(&sender, &symbol_short!("p2"), &2_000_000, &100_000, &600);

        client.accept_corridor(&a, &id1);
        client.accept_corridor(&a, &id2);

        let agent = client.get_agent(&a).unwrap();
        assert_eq!(agent.active_corridors, 2);

        client.confirm_local_payment(&sender, &id1);
        client.confirm_remote_payment(&a, &id1);
        client.settle_corridor(&id1);

        let agent = client.get_agent(&a).unwrap();
        assert_eq!(agent.active_corridors, 1);
        assert_eq!(agent.reputation, 101);
    }

    #[test]
    fn test_volume_accumulates() {
        let (env, _, client) = setup();
        let a = register_agent(&env, &client, symbol_short!("both"), 100);
        let sender = Address::generate(&env);

        for i in 1..=3 {
            let id =
                client.create_corridor(&sender, &symbol_short!("ph"), &1_000_000, &50_000, &600);
            client.accept_corridor(&a, &id);
            client.confirm_local_payment(&sender, &id);
            client.confirm_remote_payment(&a, &id);
            client.settle_corridor(&id);
        }

        assert_eq!(client.get_total_volume(), 3_000_000);
        assert_eq!(client.get_total_corridors(), 3);
        let agent = client.get_agent(&a).unwrap();
        assert_eq!(agent.reputation, 103);
    }

    #[test]
    fn test_timeout_on_created_no_agent() {
        let (env, _, client) = setup();
        let sender = Address::generate(&env);
        client.create_corridor(&sender, &symbol_short!("p1"), &1_000_000, &50_000, &2);

        env.ledger().with_mut(|l| l.timestamp = l.timestamp + 11);
        client.timeout_refund(&1);

        let c = client.get_corridor(&1).unwrap();
        assert_eq!(c.status, CorridorStatus::Timeout);
        assert!(c.completed_at.is_some());
    }

    #[test]
    fn test_timeout_on_local_paid() {
        let (env, _, client) = setup();
        let a = register_agent(&env, &client, symbol_short!("both"), 100);
        let sender = Address::generate(&env);
        client.create_corridor(&sender, &symbol_short!("p1"), &1_000_000, &50_000, &2);
        client.accept_corridor(&a, &1);
        client.confirm_local_payment(&sender, &1);

        env.ledger().with_mut(|l| l.timestamp = l.timestamp + 11);
        client.timeout_refund(&1);

        let c = client.get_corridor(&1).unwrap();
        assert_eq!(c.status, CorridorStatus::Timeout);
        assert_eq!(client.get_agent(&a).unwrap().reputation, 95);
    }

    #[test]
    fn test_timeout_on_remote_paid_no_slash() {
        let (env, _, client) = setup();
        let a = register_agent(&env, &client, symbol_short!("both"), 100);
        let sender = Address::generate(&env);
        client.create_corridor(&sender, &symbol_short!("p1"), &1_000_000, &50_000, &2);
        client.accept_corridor(&a, &1);
        client.confirm_local_payment(&sender, &1);
        client.confirm_remote_payment(&a, &1);

        env.ledger().with_mut(|l| l.timestamp = l.timestamp + 11);
        client.timeout_refund(&1);

        let c = client.get_corridor(&1).unwrap();
        assert_eq!(c.status, CorridorStatus::Timeout);
        // Agent should NOT be slashed for remote_paid timeout (already did their part)
        assert_eq!(client.get_agent(&a).unwrap().reputation, 100);
    }

    #[test]
    fn test_settle_sets_fee_bps() {
        let (env, _, client) = setup();
        let a = register_agent(&env, &client, symbol_short!("both"), 250);
        let sender = Address::generate(&env);
        let id = client.create_corridor(&sender, &symbol_short!("p1"), &1_000_000, &50_000, &600);
        client.accept_corridor(&a, &id);

        let c = client.get_corridor(&id).unwrap();
        assert_eq!(c.fee_bps, 250);
    }

    #[test]
    fn test_confirm_local_on_created_fails() {
        let (env, _, client) = setup();
        let sender = Address::generate(&env);
        client.create_corridor(&sender, &symbol_short!("p1"), &1_000_000, &50_000, &600);
        let r = client.try_confirm_local_payment(&sender, &1);
        assert_eq!(r, Err(Ok(Error::InvalidStatus)));
    }

    #[test]
    fn test_confirm_remote_on_accepted_fails() {
        let (env, _, client) = setup();
        let a = register_agent(&env, &client, symbol_short!("both"), 100);
        let sender = Address::generate(&env);
        client.create_corridor(&sender, &symbol_short!("p1"), &1_000_000, &50_000, &600);
        client.accept_corridor(&a, &1);
        let r = client.try_confirm_remote_payment(&a, &1);
        assert_eq!(r, Err(Ok(Error::InvalidStatus)));
    }

    #[test]
    fn test_settle_on_accepted_fails() {
        let (env, _, client) = setup();
        let a = register_agent(&env, &client, symbol_short!("both"), 100);
        let sender = Address::generate(&env);
        client.create_corridor(&sender, &symbol_short!("p1"), &1_000_000, &50_000, &600);
        client.accept_corridor(&a, &1);
        let r = client.try_settle_corridor(&1);
        assert_eq!(r, Err(Ok(Error::InvalidStatus)));
    }

    #[test]
    fn test_compute_quote_zero_amount() {
        assert_eq!(CorridorEscrow::compute_quote(0, 100, 500), 0);
    }

    #[test]
    fn test_compute_quote_high_fee() {
        // 50% fee
        let result = CorridorEscrow::compute_quote(1_000_000, 5000, 500);
        assert_eq!(result, 25_000);
    }

    #[test]
    fn test_compute_quote_zero_exchange_rate() {
        assert_eq!(CorridorEscrow::compute_quote(1_000_000, 100, 0), 0);
    }

    #[test]
    fn test_agent_count_tracks() {
        let (env, _, client) = setup();
        assert_eq!(client.get_agent_count(), 0);

        let _a1 = register_agent(&env, &client, symbol_short!("both"), 100);
        assert_eq!(client.get_agent_count(), 1);

        let _a2 = register_agent(&env, &client, symbol_short!("ngn"), 100);
        assert_eq!(client.get_agent_count(), 2);
    }

    #[test]
    fn test_corridor_expiry_enforcement() {
        let (env, _, client) = setup();
        let sender = Address::generate(&env);
        client.create_corridor(&sender, &symbol_short!("p1"), &1_000_000, &50_000, &1);

        // Not expired yet
        let r = client.try_timeout_refund(&1);
        assert_eq!(r, Err(Ok(Error::TimeoutNotReached)));

        // Expire
        env.ledger().with_mut(|l| l.timestamp = l.timestamp + 6);
        client.timeout_refund(&1);

        let c = client.get_corridor(&1).unwrap();
        assert_eq!(c.status, CorridorStatus::Timeout);
    }

    #[test]
    fn test_withdraw_with_active_corridors_fails() {
        let (env, _, client) = setup();
        let a = register_agent(&env, &client, symbol_short!("both"), 100);
        let sender = Address::generate(&env);
        client.create_corridor(&sender, &symbol_short!("p1"), &1_000_000, &50_000, &600);
        client.accept_corridor(&a, &1);

        let r = client.try_withdraw_collateral(&a, &100_000_000);
        assert_eq!(r, Err(Ok(Error::InsufficientCollateral)));
    }

    #[test]
    fn test_multiple_agents_different_rates() {
        let (env, _, client) = setup();
        let a1 = Address::generate(&env);
        let a2 = Address::generate(&env);
        let a3 = Address::generate(&env);
        client.register_agent(&a1, &500_000_000, &5, &symbol_short!("both"), &300);
        client.register_agent(&a2, &500_000_000, &5, &symbol_short!("both"), &50);
        client.register_agent(&a3, &500_000_000, &5, &symbol_short!("both"), &150);

        // Best should be a2 (lowest rate, same reputation)
        let best = client.find_best_agent(&symbol_short!("ngn")).unwrap();
        assert_eq!(best.address, a2);
        assert_eq!(best.rate_bps, 50);
    }
}
