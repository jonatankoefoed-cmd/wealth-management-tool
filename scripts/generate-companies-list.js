'use strict';

var fs = require('fs');
var path = require('path');

// Read existing files
var tickerMap = JSON.parse(fs.readFileSync('src/data/ticker-map.json', 'utf8'));
var secLogos = JSON.parse(fs.readFileSync('src/data/security-logos.json', 'utf8'));

var companies = [];
var seenSlugs = {};

function normalizeName(str) {
    if (!str) return '';
    return str
        .toLowerCase()
        .replace(/æ/g, 'ae')
        .replace(/ø/g, 'o')
        .replace(/å/g, 'aa')
        .replace(/é/g, 'e')
        .replace(/ü/g, 'u');
}

function addCompany(name, rawSlug) {
    if (!name) return;

    // Create a clean slug: "Novo Nordisk B" -> "novo-nordisk"
    var cleanName = name
        .replace(/\s(Corporation|Holdings|Limited|Group|Class|Inc\.?|Corp\.?|Ltd\.?|A\/S|AB|ASA|PLC|SA|AG)[^a-z]*/gi, '')
        .replace(/\s[AB]$/, '') // Novo Nordisk B -> Novo Nordisk
        .trim();

    // Normalize accents
    var normalized = normalizeName(cleanName);

    // Default slug
    var slug = normalized
        .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with dash
        .replace(/^-+|-+$/g, '')
        .replace(/-+$/, '');   // Trim dashes

    // Overrides for key companies to ensure Simple Icons match
    var overrides = {
        'novo-nordisk': 'novonordisk',
        'a-p-moller-maersk': 'maersk',
        'orsted': 'orsted',
        'meta-platforms': 'meta',
        'alphabet': 'google',
        'tesla': 'tesla',
        'danske-bank': 'danskebank',
        'carlsberg': 'carlsberg',
        'ishares-core-s-p-500-ucits-etf': 'ishares',
        'nordnet': 'nordnet',
        'nordnet-bank': 'nordnet'
    };

    // Special logic for Funds/ETFs: Use Provider Brand
    if (name.indexOf('iShares') !== -1) {
        slug = 'ishares';
        cleanName = 'iShares';
    } else if (name.indexOf('Sparindex') !== -1) {
        slug = 'sparindex';
        cleanName = 'Sparindex';
    } else if (name.indexOf('Nordea') !== -1) {
        slug = 'nordea';
        cleanName = 'Nordea';
    } else if (name.indexOf('Danske Invest') !== -1 || name.indexOf('Danske Bank') !== -1) {
        slug = 'danskebank';
        cleanName = 'Danske Bank';
    } else if (name.indexOf('Vanguard') !== -1) {
        slug = 'vanguard';
        cleanName = 'Vanguard';
    } else if (name.indexOf('Xtrackers') !== -1) {
        slug = 'dws'; // Xtrackers is DWS
        cleanName = 'Xtrackers';
    } else if (name.indexOf('Nordnet') !== -1) {
        slug = 'nordnet';
        cleanName = 'Nordnet Bank';
    } else if (overrides[slug]) {
        slug = overrides[slug];
    }

    // Store unique slugs
    if (seenSlugs[slug]) return;
    seenSlugs[slug] = true;

    companies.push({
        slug: slug,
        name: cleanName, // Use cleaned name for search
        originalName: name
    });
}

// 1. Process Ticker Map (Stocks, Crypto, ETFs)
if (tickerMap.stocks) {
    Object.keys(tickerMap.stocks).forEach(function (key) { addCompany(tickerMap.stocks[key].name); });
}
if (tickerMap.crypto) {
    Object.keys(tickerMap.crypto).forEach(function (key) { addCompany(tickerMap.crypto[key].name); });
}
if (tickerMap.etfs) {
    Object.keys(tickerMap.etfs).forEach(function (key) { addCompany(tickerMap.etfs[key].name); });
}
if (tickerMap.funds) {
    Object.keys(tickerMap.funds).forEach(function (key) { addCompany(tickerMap.funds[key].name); });
}

// 2. Process Security Logos (Manual overrides)
if (secLogos.stocks) {
    Object.keys(secLogos.stocks).forEach(function (key) { addCompany(secLogos.stocks[key].name); });
}
if (secLogos.fundProviders) {
    Object.keys(secLogos.fundProviders).forEach(function (key) { addCompany(secLogos.fundProviders[key].name); });
}

// Write output
fs.writeFileSync('src/data/companies-list.json', JSON.stringify(companies, null, 2));
console.log('Generated ' + companies.length + ' unique companies/brands.');
