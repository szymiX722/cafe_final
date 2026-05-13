const bcrypt = require('bcrypt');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URL)
    .then(() => console.log('Połączono z MongoDB'))
    .catch(err => console.error('Błąd połączenia:', err));

// --- SCHEMAT DLA CIAST ---
const zamowienieSchema = new mongoose.Schema({
    imieNazwisko: String,
    ciasto: String,
    ilosc: String,
    data_odbioru: String,
    kwota: String,
    uwagi: String,
    oplacone: { type: Boolean, default: false },
    data_zlozenia: { type: Date, default: Date.now }
});
const Zamowienie = mongoose.model('Zamowienie', zamowienieSchema);

// --- SCHEMAT DLA TORTÓW ---
const tortSchema = new mongoose.Schema({
    imieNazwisko: String,
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

// --- ENDPOINTY DLA CIAST ---
app.post('/zamowienie', async (req, res) => {
    try {
        const nowe = new Zamowienie(req.body);
        await nowe.save();
        res.status(201).json(nowe);
    } catch (err) { res.status(400).json(err); }
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
        res.status(200).send("Usunięto");
    } catch (err) { res.status(500).json(err); }
});

// --- ENDPOINTY DLA TORTÓW ---
app.post('/zamowienie-tort', async (req, res) => {
    try {
        const nowyTort = new Tort(req.body);
        await nowyTort.save();
        res.status(201).json(nowyTort);
    } catch (err) { res.status(400).json(err); }
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
        res.status(200).send("Usunięto");
    } catch (err) { res.status(500).json(err); }
});

// --- LOGOWANIE ---
const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (user && await bcrypt.compare(password, user.password)) {
            res.json({ success: true });
        } else {
            res.status(401).json({ success: false });
        }
    } catch (err) { res.status(500).json(err); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serwer biega na ${PORT}`));
