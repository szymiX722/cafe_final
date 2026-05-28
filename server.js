const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const app = express();

app.use(cors());
app.use(express.json());

// Połączenie z MongoDB Atlas
mongoose.connect(process.env.MONGO_URL)
    .then(() => console.log('Połączono z MongoDB Atlas'))
    .catch(err => console.error('Błąd połączenia:', err));

// --- SCHEMAT I MODEL DLA CIAST (Kolekcja: zamowienia) ---
const zamowienieSchema = new mongoose.Schema({
    imieNazwisko: String,
    telefon: String,
    ciasto: String,
    ilosc: String,
    data_odbioru: String,
    kwota: String,
    uwagi: String,
    oplacone: { type: Boolean, default: false },
    data_zlozenia: { type: Date, default: Date.now }
});
const Zamowienie = mongoose.model('Zamowienie', zamowienieSchema, 'zamowienia');

// --- SCHEMAT I MODEL DLA TORTÓW (Kolekcja: torts) ---
const tortSchema = new mongoose.Schema({
    imieNazwisko: String,
    telefon: String,
    porcje: String,
    biszkopt: String,
    krem1: String,
    krem2: String,
    dodatki: String,
    okazja: String,
    styl: String,
    uwagi: String,
    data_odbioru: String,
    oplacone: { type: Boolean, default: false },
    data_zlozenia: { type: Date, default: Date.now }
});
const Tort = mongoose.model('Tort', tortSchema);

// --- SCHEMATY I MODELE DLA ARCHIWUM (Kolekcje: archiwum_zamowien i archiwum_tortow) ---
const ArchiwumZamowienie = mongoose.model('ArchiwumZamowienie', new mongoose.Schema({}, { strict: false }), 'archiwum_zamowien');
const ArchiwumTort = mongoose.model('ArchiwumTort', new mongoose.Schema({}, { strict: false }), 'archiwum_tortow');

// --- SCHEMAT I MODEL DLA UŻYTKOWNIKÓW (Kolekcja: pracownicy) ---
const userSchema = new mongoose.Schema({
    login: { type: String, required: true },
    pass: { type: String, required: true }
});
const User = mongoose.model('User', userSchema, 'pracownicy');


// --- ENDPOINTY DLA CIAST ---
app.post('/zamowienie', async (req, res) => {
    try {
        const nowe = new Zamowienie(req.body);
        await nowe.save();
        res.status(201).json(nowe);
    } catch (err) { res.status(400).json({ error: err.message }); }
});

app.get('/lista-zamowien', async (req, res) => {
    try {
        const zamowienia = await Zamowienie.find().sort({ data_odbioru: 1 });
        res.json(zamowienia);
    } catch (err) { res.status(500).json(err); }
});

// --- ENDPOINTY POBIERANIA Z ARCHIWUM ---

// Pobieranie zarchiwizowanych ciast
app.get('/lista-archiwum-zamowien', async (req, res) => {
    try {
        // Sortujemy od najnowszych (data_zlozenia: -1), żeby historia była czytelna
        const archiwum = await ArchiwumZamowienie.find().sort({ data_zlozenia: -1 });
        res.json(archiwum);
    } catch (err) { res.status(500).json(err); }
});

// Pobieranie zarchiwizowanych tortów
app.get('/lista-archiwum-tortow', async (req, res) => {
    try {
        const archiwum = await ArchiwumTort.find().sort({ data_zlozenia: -1 });
        res.json(archiwum);
    } catch (err) { res.status(500).json(err); }
});

app.patch('/zamowienie/:id/status-platnosci', async (req, res) => {
    try {
        const update = await Zamowienie.findByIdAndUpdate(req.params.id, { oplacone: req.body.oplacone }, { new: true });
        res.json(update);
    } catch (err) { res.status(500).json(err); }
});

// UNIWERSALNA AKTUALIZACJA DANYCH CIASTA (Edycja z tabeli)
app.patch('/zamowienie/:id', async (req, res) => {
    try {
        const update = await Zamowienie.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(update);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ZMIENIONO: Stare usuwanie zastąpione akcją przeniesienia do archiwum
app.post('/zamowienie/:id/archiwizuj', async (req, res) => {
    try {
        const zamowienie = await Zamowienie.findById(req.params.id);
        if (!zamowienie) {
            return res.status(404).json({ error: "Nie znaleziono zamówienia" });
        }
        const daneDoArchiwum = zamowienie.toObject();
        await ArchiwumZamowienie.create(daneDoArchiwum);
        await Zamowienie.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Zamówienie zarchiwizowane pomyślnie" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- ENDPOINTY PRZYWRACANIA Z ARCHIWUM ---

// Przywracanie zamówienia na ciasto
app.post('/archiwum-zamowienie/:id/przywroc', async (req, res) => {
    try {
        const id = req.params.id;
        // 1. Znajdź w archiwum
        const zarchiwizowane = await ArchiwumZamowienie.findById(id);
        if (!zarchiwizowane) {
            return res.status(404).json({ message: "Nie znaleziono zamówienia w archiwum." });
        }

        // 2. Skonwertuj na zwykły obiekt i usuń stary identyfikator _id (Mongoose wygeneruje nowy)
        const daneZamowienia = zarchiwizowane.toObject();
        delete daneZamowienia._id;

        // 3. Zapisz w aktywnej kolekcji
        const przywrocone = new Zamowienie(daneZamowienia);
        await przywrocone.save();

        // 4. Usuń z archiwum
        await ArchiwumZamowienie.findByIdAndDelete(id);

        res.json({ success: true, message: "Zamówienie przywrócone pomyślnie." });
    } catch (err) {
        console.error(err);
        res.status(500).json(err);
    }
});

// Przywracanie zamówienia na tort
app.post('/archiwum-tort/:id/przywroc', async (req, res) => {
    try {
        const id = req.params.id;
        // 1. Znajdź w archiwum
        const zarchiwizowane = await ArchiwumTort.findById(id);
        if (!zarchiwizowane) {
            return res.status(404).json({ message: "Nie znaleziono tortu w archiwum." });
        }

        // 2. Skonwertuj na zwykły obiekt i usuń stary identyfikator _id
        const daneTortu = zarchiwizowane.toObject();
        delete daneTortu._id;

        // 3. Zapisz w aktywnej kolekcji
        const przywrocone = new Tort(daneTortu);
        await przywrocone.save();

        // 4. Usuń z archiwum
        await ArchiwumTort.findByIdAndDelete(id);

        res.json({ success: true, message: "Tort przywrócony pomyślnie." });
    } catch (err) {
        console.error(err);
        res.status(500).json(err);
    }
});

// --- ENDPOINTY DLA TORTÓW ---
app.post('/zamowienie-tort', async (req, res) => {
    try {
        const nowyTort = new Tort(req.body);
        await nowyTort.save();
        res.status(201).json(nowyTort);
    } catch (err) { res.status(400).json({ error: err.message }); }
});

app.get('/lista-tortow', async (req, res) => {
    try {
        const torty = await Tort.find().sort({ data_odbioru: 1 });
        res.json(torty);
    } catch (err) { res.status(500).json(err); }
});

app.patch('/tort/:id/status-platnosci', async (req, res) => {
    try {
        const update = await Tort.findByIdAndUpdate(req.params.id, { oplacone: req.body.oplacone }, { new: true });
        res.json(update);
    } catch (err) { res.status(500).json(err); }
});

// UNIWERSALNA AKTUALIZACJA DANYCH TORTU (Edycja z tabeli)
app.patch('/tort/:id', async (req, res) => {
    try {
        const update = await Tort.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(update);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ZMIENIONO: Stare usuwanie zastąpione akcją przeniesienia do archiwum
app.post('/tort/:id/archiwizuj', async (req, res) => {
    try {
        const tort = await Tort.findById(req.params.id);
        if (!tort) {
            return res.status(404).json({ error: "Nie znaleziono tortu" });
        }
        const daneDoArchiwum = tort.toObject();
        await ArchiwumTort.create(daneDoArchiwum);
        await Tort.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Tort zarchiwizowany pomyślnie" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});


// --- LOGOWANIE ---
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ login: username });
        
        if (!user || !user.pass) {
            return res.status(401).json({ success: false, message: "Błędne dane" });
        }

        const isMatch = await bcrypt.compare(password, user.pass);

        if (isMatch) {
            res.json({ success: true, message: "Zalogowano" });
        } else {
            res.status(401).json({ success: false, message: "Błędne dane" });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- START SERWERA ---
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Serwer biega na porcie ${PORT}`));
}

module.exports = app;
