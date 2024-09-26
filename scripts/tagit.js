import { Settings, mod } from "./settings.js";
import { TagItSearch } from "./search.js";
import { TagItPackCache } from "./packcache.js";
import { TagItTagManager } from "./tagmanager.js";
import { TagItInput } from "./input.js";
import { TagItIndex, tagsort } from "./index.js";

class TagIt extends FormApplication {
  tagcache = null;
  tags = [];

  // Such as from a non-linked token's actor
  readOnlyTags = [];

  constructor(object, options) {
    super(object, options);

    this.entity.apps[this.appId] = this;
  }

  get entity() {
    return this.object;
  }

  static get defaultOptions() {
    const options = super.defaultOptions;
    options.template = `modules/${mod}/templates/template.html`;
    options.width = "400";
    options.height = "250";
    options.classes = ["tagit", "sheet"];
    options.title = game.i18n.localize("TagIt.label");
    options.resizable = true;
    options.editable = true;
    return options;
  }

  async getData() {
    const data = super.getData();

    this.tags = this.entity.getFlag(mod, "tags") ?? [];

    if (this.entity.documentName === "Actor" && this.entity.isToken) {
      this.tags = this.entity.token.getFlag(mod, "tags") ?? [];
      this.readOnlyTags = this.entity.getFlag(mod, "tags") ?? [];
    }

    this.tagcache = await TagItTagManager.getUsedTags();

    data.tags = this.tags.sort(tagsort);
    data.tagcache = this.tagcache;
    data.flags = this.entity.data.flags;
    data.owner = game.user.id;
    data.isGM = game.user.isGM;
    data.appId = this.appId;

    return data;
  }

  activateListeners(html) {
    const _this = this;
    super.activateListeners(html);

    if (_this.readOnlyTags) {
      // Render read only version for tags.
      _this.readOnlyTags.forEach((tag) => {
        TagItInput.addtag(tag, _this, {
          updateAutocomplete: false,
          readonly: true,
        });
      });
    }

    if (_this.tags) {
      _this.tags.forEach((tag) => {
        TagItInput.addtag(tag, _this, {
          updateAutocomplete: false,
        });
      });
    }

    TagItInput.calculateAutocompleteList(_this);
    TagItInput.registerListeners(_this);
  }

  async _updateObject(event, formData) {
    if (game.user.isGM) {
      const collection = $("div.tag.collection", this.element);

      const items = $("span.tagit.tag", collection)
        .map(function () {
          if ($("i.fa-times-circle", this).length > 0) {
            return TagItInput.spanToTag($(this));
          }
        })
        .get()
        .sort((a, b) => {
          const comp = a.tag.localeCompare(b.tag);
          if (comp === 0) {
            // Sort values
            return a.value - b.value;
          } else {
            return comp;
          }
        });

      let entity = this.entity;

      if (this.entity.documentName === "Actor" && this.entity.isToken) {
        entity = this.entity.token;
      }

      let numTags = 0;
      const originalTags = entity.getFlag(mod, "tags");

      if (originalTags) {
        numTags = originalTags.length;
      }

      if (items.length > 0) {
        await entity.setFlag(mod, "tags", items);
      } else {
        await entity.unsetFlag(mod, "tags");
      }

      numTags = items.length - numTags;
      if (numTags > 0) {
        // Added

        ui.notifications.info(
          `Added ${numTags} tag${numTags == 1 ? "" : "s"} to ${entity.name}`
        );
      } else if (numTags < 0) {
        // Removed
        ui.notifications.info(
          `Removed ${numTags * -1} tag${numTags == -1 ? "" : "s"} from ${
            entity.name
          }`
        );
      }

      this.render();
    } else {
      ui.notifications.error("You have to be GM to update tags");
    }
  }

  static _initEntityHook(app, html, data) {
    if (game.user.isGM) {
      let title = game.i18n.localize("TagIt.label");
      let labelTxt = `${title}`;

      let openBtn = $(
        `<a class="open-${mod}" title="${title}"><i class="fas fa-clipboard"></i>${labelTxt}</a>`
      );
      openBtn.click((ev) => {
        let _app = null;
        for (let key in app.document.apps) {
          let obj = app.document.apps[key];
          if (obj instanceof TagIt) {
            _app = obj;
            break;
          }
        }
        if (!_app)
          _app = new TagIt(app.document, {
            submitOnClose: true,
            closeOnSubmit: false,
            submitOnUnfocus: true,
          });
        _app.render(true);
      });
      html.closest(".app").find(`.open-${mod}`).remove();
      let titleElement = html.closest(".app").find(".window-title");
      openBtn.insertAfter(titleElement);
    }
  }

  static async migrateFrom02() {
    console.log(`TagIt!: Migrating from v0.2...`);

    const promises = [];

    for (const document of game.journal.filter((a) =>
      a.data.flags?.tagit?.tags?.some((b) => typeof b === "string")
    )) {
      const tags = document.getFlag("tagit", "tags");

      for (let i = 0; i < tags.length; i++) {
        if (typeof tags[i] === "string") {
          tags[i] = { tag: tags[i] };
        }
      }

      promises.push(document.setFlag("tagit", "tags", tags));
    }

    for (const document of game.scenes.filter((a) =>
      a.data.flags?.tagit?.tags?.some((b) => typeof b === "string")
    )) {
      const tags = document.getFlag("tagit", "tags");

      for (let i = 0; i < tags.length; i++) {
        if (typeof tags[i] === "string") {
          tags[i] = { tag: tags[i] };
        }
      }

      promises.push(document.setFlag("tagit", "tags", tags));
    }

    for (const document of game.actors.filter((a) =>
      a.data.flags?.tagit?.tags?.some((b) => typeof b === "string")
    )) {
      const tags = document.getFlag("tagit", "tags");

      for (let i = 0; i < tags.length; i++) {
        if (typeof tags[i] === "string") {
          tags[i] = { tag: tags[i] };
        }
      }

      promises.push(document.setFlag("tagit", "tags", tags));
    }

    for (const document of game.items.filter((a) =>
      a.data.flags?.tagit?.tags?.some((b) => typeof b === "string")
    )) {
      const tags = document.getFlag("tagit", "tags");

      for (let i = 0; i < tags.length; i++) {
        if (typeof tags[i] === "string") {
          tags[i] = { tag: tags[i] };
        }
      }

      promises.push(document.setFlag("tagit", "tags", tags));
    }

    const index = await TagItPackCache._getPacksWithTagsIndex(
      TagItPackCache._getPackIndexPromises()
    );

    for (const pack of index.filter((a) =>
      a.items.some((b) => b.flags.tagit.tags.some((c) => typeof c === "string"))
    )) {
      for (const index of pack.items) {
        const document = await game.packs
          .get(`${pack.pack}.${pack.name}`)
          .getDocument(index._id);

        const tags = document.getFlag("tagit", "tags");
        for (let i = 0; i < tags.length; i++) {
          if (typeof tags[i] === "string") {
            tags[i] = { tag: tags[i] };
          }
        }

        promises.push(document.setFlag("tagit", "tags", tags));
      }
    }

    for (const scene of game.scenes.filter((a) => a.tokens.size > 0)) {
      for (const document of scene.tokens.filter(
        (a) => a.data.flags?.tagit?.tags?.length > 0
      )) {
        const tags = document.getFlag("tagit", "tags");

        for (let i = 0; i < tags.length; i++) {
          if (typeof tags[i] === "string") {
            tags[i] = { tag: tags[i] };
          }
        }

        promises.push(document.setFlag("tagit", "tags", tags));
      }
    }

    await Promise.all(promises);

    if (promises.length > 0) {
      await TagItPackCache.init();
    }

    console.log(`TagIt!: Migrated ${promises.length} documents.`);

    console.log(`TagIt!: Done migrating.`);
  }
}

Hooks.on("renderJournalSheet", (app, html, data) => {
  TagIt._initEntityHook(app, html, data);
});

Hooks.on("renderActorSheet", (app, html, data) => {
  TagIt._initEntityHook(app, html, data);
});
Hooks.on("renderItemSheet", (app, html, data) => {
  TagIt._initEntityHook(app, html, data);
});

Hooks.on("renderSceneConfig", (app, html, data) => {
  TagIt._initEntityHook(app, html, data);
});

Hooks.once("ready", async () => {
  Settings.registerSettings();

  game.modules.get(mod).api = {
    search: TagItSearch.search,
    find: TagItSearch.find,
    //        packCache: TagItPackCache,
    //        index: TagItIndex,
  };

  await TagIt.migrateFrom02();

  await TagItPackCache.init();
  await TagItIndex.init();
});
