var BaseStore = require("./BaseStore");
var Immutable = require("immutable");
var alt = require("../alt-instance");
var VoteActions = require("../actions/VoteActions");
var AccountActions = require("../actions/AccountActions");
var AccountStore = require("../stores/AccountStore");
var Utils = require("common/utils");

const DELEGATE = 0;
const WITNESS = 1;
const BUDGET_ITEM = 2;

class VoteStore extends BaseStore {

    constructor() {
        super();
        this.i_proxies = {};
        this.i_delegates = {};
        this.i_witnesses = {};
        this.i_budget_items = {};
        this.c_proxies = {};
        this.c_delegates = {};
        this.c_witnesses = {};
        this.c_budget_items = {};
        this.cachedAccountsJson = {};
        this.bindActions(VoteActions);
        this.bindListeners({
            onGetAccount: AccountActions.getAccount,
            onTransactUpdateAccount: AccountActions.transactUpdateAccount
        });
    }

    onAddItem(data) {
        let container = this["c_"+data.container_name];
        let account_obj = {id: null, name: data.item.name};
        this.storeItem(null, container, data.account_name, account_obj);
    }

    onRemoveItem(data) {
        let container = this["c_"+data.container_name];
        let items = container[data.account_name];
        let index = items.findIndex(i => i.name === data.item.name);
        if (index >= 0) {
            container[data.account_name] = items.delete(index);
        }
    }

    onSetProxyAccount(data) {
        console.log("[VoteStore.js:26] ----- onSetProxyAccount ----->", data);
    }

    onPublishChanges(account_name) {
        if(
            this.i_delegates[account_name] !== this.c_delegates[account_name] ||
            this.i_witnesses[account_name] !== this.c_witnesses[account_name] ||
            this.i_budget_items[account_name] !== this.c_budget_items[account_name]
        ) {
            let vote_options = []
                .concat(this.listToVoteOptions(DELEGATE, this.c_delegates[account_name]))
                .concat(this.listToVoteOptions(WITNESS, this.c_witnesses[account_name]))
                .concat(this.listToVoteOptions(BUDGET_ITEM, this.c_budget_items[account_name]));
            //console.log("[VoteStore.js:30] ----- onPublishChanges ----->", vote_options);
            //let account_store_data = AccountStore.getState();
            //let account =  account_store_data.cachedAccounts.get(account_store_data.account_name_to_id[account_name]).toJSON();
            let account = this.cachedAccountsJson[account_name];
            account.new_options = account.options;
            account.new_options.votes = vote_options;
            console.log("[VoteStore.js:63] ----- onPublishChanges ----->", account);
            AccountActions.transactUpdateAccount(account);
        }
    }

    onCancelChanges(account_name) {
        console.log("[VoteStore.js:34] ----- onCancelChanges ----->");
        this.resetContainer(this.i_delegates, this.c_delegates, account_name);
        this.resetContainer(this.i_witnesses, this.c_witnesses, account_name);
        this.resetContainer(this.i_budget_items, this.c_budget_items, account_name);
    }

    initContainer(i_container, c_container, account_name) {
        let items = Immutable.List();
        i_container[account_name] = items;
        c_container[account_name] = items;
    }

    resetContainer(i_container, c_container, account_name) {
        c_container[account_name] = i_container[account_name];
    }

    storeItem(i_container, c_container, account_name, account_obj) {
        let items = c_container[account_name];
        items = items.push(account_obj);
        if(i_container) i_container[account_name] = items;
        c_container[account_name] = items;
    }

    listToVoteOptions(vt, list){
        let account_name_to_id = AccountStore.getState().account_name_to_id;
        let res = [];
        for(let v of list){
            let account_id = account_name_to_id[v.name];
            if(account_id) {
                res.push([`${vt}:${Utils.get_object_id(account_id)}`]);
            }
        }
        return res;
    }

    onGetAccount(result) {
        if (result.sub) return;
        let account_id_to_name = AccountStore.getState().account_id_to_name;
        let account = result[0][0];
        this.cachedAccountsJson[account.name] = account;
        this.initContainer(this.i_delegates, this.c_delegates, account.name);
        this.initContainer(this.i_witnesses, this.c_witnesses, account.name);
        this.initContainer(this.i_budget_items, this.c_budget_items, account.name);
        for(let v of account.options.votes) {
            let [vt, vk] = v.split(":");
            let account_id = "1.2." + vk;
            let account_name = account_id_to_name[account_id];
            let account_obj = {id: account_id, name: account_name};
            if(vt == DELEGATE) this.storeItem(this.i_delegates, this.c_delegates, account.name, account_obj);
            if(vt == WITNESS) this.storeItem(this.i_witnesses, this.c_witnesses, account.name, account_obj);
            if(vt == BUDGET_ITEM) this.storeItem(this.i_budget_items, this.c_budget_items, account.name, account_obj);
        }
        let proxy_id = account.options.voting_account;
        if(proxy_id && proxy_id !== "1.2.0") {
            let proxy_name = account_id_to_name[proxy_id];
            let account_obj = {id: proxy_id, name: proxy_name};
            this.i_proxies[account.name] = account_obj;
            this.c_proxies[account.name] = account_obj;
        } else {
            this.i_proxies[account.name] = null;
            this.c_proxies[account.name] = null;
        }
    }

    onTransactUpdateAccount(account) {
        console.log("[VoteStore.js] ----- onTransactUpdateAccount ----->", account);
        this.resetContainer(this.i_delegates, this.c_delegates, account.name);
        this.resetContainer(this.i_witnesses, this.c_witnesses, account.name);
        this.resetContainer(this.i_budget_items, this.c_budget_items, account.name);
    }

}

module.exports = alt.createStore(VoteStore, "VoteStore");
