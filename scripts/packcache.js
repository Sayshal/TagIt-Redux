export class TagItPackCache {
  static index = null;
  static _index = null;

  static _getPackIndexPromises() {
    const packIndexes = [];

    for (const pack of game.packs.filter(
      (a) =>
        a.metadata.entity === "Actor" ||
        a.metadata.entity === "JournalEntry" ||
        a.metadata.entity === "Item" ||
        a.metadata.entity === "Scene"
    )) {
      packIndexes.push({
        pack: pack.metadata.package,
        name: pack.metadata.name,
        type: pack.documentName,
        index: pack.getIndex({ fields: ["flags",  "thumb"] }), //removed "img", for testing.
      });
    }

    return packIndexes;
  }

  static async _getPacksWithTagsIndex(indexes) {
    const packs = [];

    await Promise.all(indexes.flatMap((a) => a.index));

    for (const pack of indexes) {
      const index = await pack.index;

      var packsWithTags = index.filter((b) => b.flags?.tagit?.tags?.length > 0);

      if (packsWithTags.length > 0) {
        packs.push({
          pack: pack.pack,
          name: pack.name,
          type: pack.type,
          items: packsWithTags,
        });
      }
    }

    return packs;
  }

  static async _getPacksWithTagsIndex2(indexes) {
    const packs = {};

    await Promise.all(indexes.flatMap((a) => a.index));

    for (const pack of indexes) {
      const index = await pack.index;

      //var packsWithTags = index.filter(b => b.flags?.tagit?.tags?.length > 0);

      //if (packsWithTags.length > 0) {
      if (index.contents.length > 0) {
        //packs[`${pack.pack}.${pack.name}`] = {pack: pack.pack, name: pack.name, type: pack.type, items: packsWithTags};
        packs[`${pack.pack}.${pack.name}`] = {
          pack: pack.pack,
          name: pack.name,
          type: pack.type,
          items: index.contents,
        };
      }
    }

    return packs;
  }

  static async _getPacks(indexes) {
    const packs = [];

    await Promise.all(indexes.flatMap((a) => a.index));

    for (const pack of indexes) {
      const index = await pack.index;

      packs.push({
        pack: pack.pack,
        name: pack.name,
        type: pack.type,
        items: index,
      });
    }

    return packs;
  }

  static async refresh() {
    const promises = TagItPackCache._getPackIndexPromises();

    TagItPackCache.index = await TagItPackCache._getPacksWithTagsIndex(
      promises
    );

    return TagItPackCache.index;
  }

  static async getFullIndex() {
    const promises = TagItPackCache._getPackIndexPromises();
    const indexes = await TagItPackCache._getPacks(promises);

    return indexes;
  }

  static get Index() {
    return Object.values(TagItPackCache._index);
  }

  static get TagIndex() {
    return Object.values(TagItPackCache._index)
      .filter((a) => a.items.some((b) => b.flags?.tagit?.tags?.length > 0))
      .map((a) => {
        return {
          name: a.name,
          pack: a.pack,
          type: a.type,
          items: a.items.filter((b) => b.flags?.tagit?.tags?.length > 0),
        };
      });
  }

  static async init() {
    const t0 = performance.now();
    const promises = TagItPackCache._getPackIndexPromises();

    TagItPackCache._index = await TagItPackCache._getPacksWithTagsIndex2(
      promises
    );

    const t1 = performance.now();

    console.log(
      `PackCache build took ${t1 - t0} milliseconds for ${
        TagItPackCache._index.length
      } documents.`
    );
  }

  static async updateCompendiumCache(compendium) {
    const index = await compendium.getIndex({
      fields: ["flags", "thumb"], //removed , "img" for testing.
    });

    TagItPackCache._index[
      `${compendium.metadata.package}.${compendium.metadata.name}`
    ] = {
      pack: compendium.metadata.package,
      name: compendium.metadata.name,
      type: compendium.documentName,
      items: index,
    };
    console.log(
      `TagIt: Refreshed index for compendium ${compendium.metadata.package}.${compendium.metadata.name}`
    );
  }
}

Hooks.on("updateCompendium", (app, html, data) => {
  if (html.filter((a) => a.flags?.tagit?.tags).length > 0) {
    TagItPackCache.updateCompendiumCache(app);
  }
});

Hooks.once("ready", async () => {});
