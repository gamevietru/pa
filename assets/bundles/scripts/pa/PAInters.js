var JS = require("PAJS");
var UI = require("PAUI");

cc.Class({
	extends: cc.Component,
	ctor() {
		this.prefabs = {};
	},
	setManager(manager) {
		this.manager = manager;
	},
	loadAsync() {
		if (this.instance) {
			return Promise.resolve(this.instance);
		}
		if (this.loading) {
			return Promise.reject({ reason: "PA_INTER_LOADING" })
		}
		var configs = this.manager.configs;
		if (!configs) {
			return Promise.reject({ reason: "PA_NOT_INITIALIZED" });
		}
		var next = configs.getNext("inter");
		if (!next) {
			return Promise.reject({ reason: "PA_INTER_NOT_AVAILABLE" });
		}
		this.loading = true;
		return this.createPrefabAsync(next)
			.then((r) => {
				this.instance = r;
				UI.emit(this.node, "ready", r);
			})
			.finally(() => this.loading = false);
	},
	showAsync() {
		if (!this.instance) {
			return Promise.reject({ reason: "PA_INTER_NOT_LOADED" });
		}
		var instance = this.instance;
		var instanceId = instance.data.id;
		// reload
		this.instance = null;
		this.loadAsync();
		// show
		this.manager.onShow(instanceId, "inter");
		FBInstant.logEvent("PA_INTER_SHOW", 0, {
			id: instanceId,
			count: this.manager.configs.getInterCount()
		});
		UI.clear(this.node);
		UI.add(instance.node, this.node);
		return instance.showAsync();
	},
	createPrefabAsync(d) {
		var path = this.getPrefabPath(d.template);
		return this.loadPrefabAsync(path).then((prefab) => {
			var r = UI.create(prefab, "PAInter");
			UI.on(r.node, "click", () => {
				this.manager.onClick(r.data.id, "inter");
				FBInstant.logEvent("PA_INTER_CLICK", 0, {
					id: r.data.id
				});
			});
			UI.on(r.node, "cancel", () => {
				FBInstant.logEvent("PA_INTER_CANCEL", 0, {
					id: r.data.id
				});
			});
			return r.setDataAsync(d).then(() => r);
		});
	},
	getPrefabPath(d) {
		if (JS.isString(d) && !d.startsWith("http")) {
			return JS.format("inters/%s", d);
		} else {
			return "prefabs/pa-inter";
		}
	},
	loadPrefabAsync(path) {
		if (this.prefabs[path]) {
			return Promise.resolve(this.prefabs[path]);
		}
		return this.manager.bundle.loadAsync(path, cc.Prefab)
			.then((prefab) => this.prefabs[path] = prefab);
	}
});