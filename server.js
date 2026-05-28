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
app.get('/lista-archiwum-zamowien', async (req, res) => {
    try {
        const archiwum = await ArchiwumZamowienie.find().sort({ data_zlozenia: -1 });
        res.json(archiwum);
    } catch (err) { res.status(500).json(err); }
});

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

app.patch('/zamowienie/:id', async (req, res) => {
    try {
        const update = await Zamowienie.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(update);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

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
app.post('/archiwum-zamowienie/:id/przywroc', async (req, res) => {
    try {
        const id = req.params.id;
        const zarchiwizowane = await ArchiwumZamowienie.findById(id);
        if (!zarchiwizowane) {
            return res.status(404).json({ message: "Nie znaleziono zamówienia w archiwum." });
        }

        const daneZamowienia = zarchiwizowane.toObject();
        delete daneZamowienia._id;

        const przywrocone = new Zamowienie(daneZamowienia);
        await przywrocone.save();
        await ArchiwumZamowienie.findByIdAndDelete(id);

        res.json({ success: true, message: "Zamówienie przywrócone pomyślnie." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/archiwum-tort/:id/przywroc', async (req, res) => {
    try {
        const id = req.params.id;
        const zarchiwizowane = await ArchiwumTort.findById(id);
        if (!zarchiwizowane) {
            return res.status(404).json({ message: "Nie znaleziono tortu w archiwum." });
        }

        const daneTortu = zarchiwizowane.toObject();
        delete daneTortu._id;

        const przywrocone = new Tort(daneTortu);
        await przywrocone.save();
        await ArchiwumTort.findByIdAndDelete(id);

        res.json({ success: true, message: "Tort przywrócony pomyślnie." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
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

app.patch('/tort/:id', async (req, res) => {
    try {
        const update = await Tort.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(update);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/tort/:id/archiwizuj', async (req, res) => {
    try {
        const tort = await Tort.findById(req.params.id);
        if (!tort) {
            return res.status(404).json({ error: "Nie znaleziono tortu" });
        }
        const daneDoArchiwum = tort.toObject();
        await ArchiwumTort.create(daneDoArchiwum);
        await Tort.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Tort zarchiwizowane pomyślnie" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});


// --- NAPRAWIONE LOGOWANIE (Obsługa haseł jawnych i bcrypt) ---
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ login: username });
        
        if (!user || !user.pass) {
            return res.status(401).json({ success: false, message: "Błędne dane" });
        }

        let isMatch = false;

        // Krok 1: Sprawdzenie, czy hasło w bazie pasuje jako zwykły tekst (Plain text)
        if (password === user.pass) {
            isMatch = true;
        } else {
            // Krok 2: Jeśli nie pasuje jako tekst, spróbuj porównać za pomocą bcrypt (zabezpieczenie przed błędem struktury hasha)
            try {
                isMatch = await bcrypt.compare(password, user.pass);
            } catch (bcryptErr) {
                // Jeśli hasło w bazie nie było poprawnym hashem bcrypt, biblioteka rzuci błąd. 
                // Ignorujemy go, bo wiemy już, że zwykły tekst również nie pasował.
                isMatch = false;
            }
        }

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
