import { mod } from "./settings.js";

export function tagsort(a, b) {
  const def = game.settings.get(mod, "defaultSort");

  let sort = (a.sort ?? def) - (b.sort ?? def);

  if (sort != 0) {
    // Different sort values
    return sort;
  }

  if (a.meta && !b.meta) {
    // Put 'a' tag behind non-meta 'b' tag
    sort = 1;
  } else if (b.meta && !a.meta) {
    // Put 'b' tag behind non-meta 'a' tag
    sort = -1;
  } else if (a.meta && b.meta) {
    // Both have meta tags
    sort = a.meta.localeCompare(b.meta);
  }

  if (sort != 0) {
    // Sort on meta, if available
    return sort;
  }

  sort = a.tag.localeCompare(b.tag);

  if (sort != 0) {
    // Different tags
    return sort;
  }
}

export class TagItIndex {
  static _index = new Array();

  static get DocumentTypes() {
    return ["JournalEntry", "Actor", "Item", "Scene"];
  }

  static async init() {
    const promise = new Promise(async function (resolve, reject) {
      const t0 = performance.now();

      TagItIndex._index = new Array();
      const index = TagItIndex._index;

      const compendiums = game.packs
        .filter((compendium) =>
          TagItIndex.DocumentTypes.includes(compendium.documentName)
        )
        .map((compendium) => {
          return {
            package: compendium.metadata.package,
            name: compendium.metadata.name,
            documentName: compendium.documentName,
            index: compendium.getIndex({ fields: ["flags", "img", "thumb"] }),
          };
        });

      index.push(
        ...game.journal
          .filter((document) => document.permission > 0)
          .map((document) => {
            return {
              id: document.id,
              name: document.name,
              documentName: document.documentName,
              tags:
                document.flags?.tagit?.tags?.length > 0
                  ? document.flags.tagit.tags.sort(tagsort)
                  : [],
              document: document,
              img: document.img,
            };
          })
      );

      index.push(
        ...game.scenes
          .filter((document) => document.permission > 0)
          .map((document) => {
            return {
              id: document.id,
              name: document.name,
              documentName: document.documentName,
              tags:
                document.flags?.tagit?.tags?.length > 0
                  ? document.flags.tagit.tags.sort(tagsort)
                  : [],
              document: document,
              img: document.thumb,
            };
          })
      );

      index.push(
        ...game.actors
          .filter((document) => document.permission > 0)
          .map((document) => {
            return {
              id: document.id,
              name: document.name,
              documentName: document.documentName,
              tags:
                document.flags?.tagit?.tags?.length > 0
                  ? document.flags.tagit.tags.sort(tagsort)
                  : [],
              document: document,
              img: document.img,
            };
          })
      );

      index.push(
        ...game.items
          .filter((document) => document.permission > 0)
          .map((document) => {
            return {
              id: document.id,
              name: document.name,
              documentName: document.documentName,
              tags:
                document.flags?.tagit?.tags?.length > 0
                  ? document.flags.tagit.tags.sort(tagsort)
                  : [],
              document: document,
              img: document.img,
            };
          })
      );

      await Promise.all(compendiums.flatMap((a) => a.index));

      for (const compendium of compendiums) {
        const compendiumIndex = await compendium.index;

        index.push(
          ...compendiumIndex.contents.map((document) => {
            return {
              id: document._id,
              name: document.name,
              documentName: compendium.documentName,
              tags:
                document.flags?.tagit?.tags?.length > 0
                  ? document.flags.tagit.tags.sort(tagsort)
                  : [],
              get document() {
                return (async () => {
                  return await game.packs
                    .get(`${compendium.package}.${compendium.name}`)
                    .getDocument(document._id);
                })();
              },
              img:
                compendium.documentName === "Scene"
                  ? document.thumb
                  : document.img,
              compendium: `${compendium.package}.${compendium.name}`,
            };
          })
        );
      }

      const t1 = performance.now();

      console.log(
        `Cache build took ${t1 - t0} milliseconds for ${
          TagItIndex._index.length
        } documents.`
      );

      resolve();
    });

    return promise;
  }

  static get Index() {
    return TagItIndex._index;
  }
}

for (const document of TagItIndex.DocumentTypes) {
  Hooks.on(`create${document}`, (app, html, data) => {
    const newDocument = {
      id: app.id,
      name: app.name,
      documentName: app.documentName,
      tags:
        app.flags?.tagit?.tags?.length > 0
          ? app.flags.tagit.tags.sort(tagsort)
          : [],
      document: app,
      img: app.documentName === "Scene" ? app.thumb : app.img,
    };

    if (app.pack) {
      newDocument.compendium = app.pack;
    }

    TagItIndex._index.push(newDocument);
  });

  Hooks.on(`update${document}`, (app, html, data) => {
    const index = TagItIndex._index.find(
      (a) => a.id === app.id && a.documentName === app.documentName
    );
    if (Object.keys(html).length == 1) {
      // No change to object, just index.
      return;
    }

    if (html.name) {
      index.name == html.name;
    }

    if (html.flags?.tagit?.tags?.length > 0) {
      index.tags = html.flags.tagit.tags.sort(tagsort);
    } else {
      index.tags = [];
    }

    if (app.documentName === "Scene" && html.thumb !== undefined) {
      index.img = html.thumb;
    } else if (html.img !== undefined) {
      index.img = html.img;
    }
  });

  Hooks.on(`delete${document}`, (app, html, data) => {
    const index = TagItIndex._index.findIndex(
      (a) => a.id === app.id && a.documentName === app.documentName
    );
    TagItIndex._index.splice(index, 1);
  });
}
