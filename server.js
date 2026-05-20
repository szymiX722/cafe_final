const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs'); // DODAJ TĘ LINIJKĘ
const app = express();

app.use(cors());
app.use(express.json());

// Połączenie z MongoDB Atlas (zmienna MONGO_URL w Railway)
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
    telefon: String, // DODANE POLE
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

app.patch('/zamowienie/:id/status-platnosci', async (req, res) => {
    try {
        const update = await Zamowienie.findByIdAndUpdate(req.params.id, { oplacone: req.body.oplacone }, { new: true });
        res.json(update);
    } catch (err) { res.status(500).json(err); }
});

app.delete('/zamowienie/:id', async (req, res) => {
    try {
        await Zamowienie.findByIdAndDelete(req.params.id);
        res.status(200).send({ message: 'Usunięto' });
    } catch (err) { res.status(500).json(err); }
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

app.delete('/tort/:id', async (req, res) => {
    try {
        await Tort.findByIdAndDelete(req.params.id);
        res.status(200).send({ message: 'Usunięto' });
    } catch (err) { res.status(500).json(err); }
});


// --- LOGOWANIE ---
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ login: username });
        
        // Logi pomocnicze w panelu Vercel (zobaczysz w zakładce Logs co dokładnie tam trafia)
        console.log("Próba logowania użytkownika:", username);
        console.log("Czy znaleziono użytkownika w bazie?:", !!user);
        if (user) {
            console.log("Hasz pobrany z bazy (user.pass):", user.pass);
            console.log("Hasło przesłane z front-endu:", password);
        }

        if (!user || !user.pass) {
            return res.status(401).json({ success: false, message: "Błędne dane lub brak pola pass w schemacie" });
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

// --- START SERWERA (POPRAWNA KOŃCÓWKA DLA VERCEL) ---
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Serwer biega na porcie ${PORT}`));
}

module.exports = app;
