async function () {
  // Seed a reading material (with key takeaways) into IndexedDB so the
  // flashcards deck and quiz generator have real content to work with.
  //
  // The app stores data in a SCOPED database: "FacheeUnitedDB" while signed
  // out, and "FacheeUnitedDB_account_<userId>" once signed in (see
  // src/utils/storage.ts and the dataScope value in src/App.tsx). We must seed
  // the same scope the app is currently reading from, otherwise the material is
  // invisible and the flashcards/quiz checks fail.
  var scope = 'local';

  // Recover the injected Supabase session to learn the signed-in user id.
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (!key || key.indexOf('-auth-token') === -1) continue;
      var raw = localStorage.getItem(key);
      if (!raw) continue;
      var session = JSON.parse(raw);
      var uid = session && session.user && session.user.id;
      if (uid) {
        scope = 'account_' + uid;
        break;
      }
    }
  } catch (e) { /* fall back to the local scope */ }

  var dbName = scope === 'local' ? 'FacheeUnitedDB' : 'FacheeUnitedDB_' + scope;
  var db = await new Promise(function (resolve, reject) {
    var req = indexedDB.open(dbName, 1);
    req.onupgradeneeded = function (e) {
      var d = e.target.result;
      if (!d.objectStoreNames.contains('materials')) d.createObjectStore('materials', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('study_tips')) d.createObjectStore('study_tips', { keyPath: 'id' });
    };
    req.onsuccess = function () { resolve(req.result); };
    req.onerror = function () { reject(req.error); };
  });

  var now = new Date().toISOString();
  var material = {
    id: 'smoke_mat_1',
    title: 'Photosynthesis Fundamentals',
    subject: 'Biology',
    author: 'Dr. Smoke',
    professor: 'Dr. Smoke',
    semester: 'Fall 2026',
    description: 'How plants convert light into chemical energy.',
    status: 'under_review',
    priority: 'high',
    rating: 5,
    totalPages: 120,
    pagesRead: 60,
    tags: ['biology', 'plants'],
    notesMarkdown: 'Key concepts for the smoke test.',
    keyTakeaways: [
      'Chlorophyll absorbs red and blue wavelengths and reflects green light.',
      'The light-dependent reactions occur in the thylakoid membrane.',
      'The Calvin cycle fixes CO2 into glucose within the stroma.',
    ],
    photos: [],
    videoLinks: [],
    shortVideos: [],
    documents: [],
    createdAt: now,
    updatedAt: now,
  };

  await new Promise(function (resolve, reject) {
    var tx = db.transaction('materials', 'readwrite');
    var store = tx.objectStore('materials');
    var req = store.put(material);
    req.onsuccess = function () { resolve(); };
    req.onerror = function () { reject(req.error); };
    tx.oncomplete = function () { resolve(); };
  });
  // The app marks the scope as initialised so it does not fall back to the
  // bundled demo data. Use the same scoped key the app uses.
  try {
    localStorage.setItem(
      scope === 'local' ? 'fachee_materials_initialized' : 'fachee_materials_initialized_' + scope,
      '1'
    );
  } catch (e) { /* ignore */ }

  return { ok: true, id: material.id, takeaways: material.keyTakeaways.length, scope: scope, db: dbName };
}
