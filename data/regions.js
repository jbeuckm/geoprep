// Region definitions. Names are canonical unit names (after renaming in app.js).
// WORLD_REGIONS: continents first, then study sub-regions. Overlap is fine.
window.WORLD_CONTINENTS = {
"Africa":["Algeria","Angola","Benin","Botswana","Burkina Faso","Burundi","Cameroon","Central African Republic","Chad","Republic of the Congo","DR Congo","Côte d'Ivoire","Djibouti","Egypt","Equatorial Guinea","Eritrea","Eswatini","Ethiopia","Gabon","Gambia","Ghana","Guinea","Guinea-Bissau","Kenya","Lesotho","Liberia","Libya","Madagascar","Malawi","Mali","Mauritania","Morocco","Mozambique","Namibia","Niger","Nigeria","Rwanda","Senegal","Sierra Leone","Somalia","South Africa","South Sudan","Sudan","Tanzania","Togo","Tunisia","Uganda","Zambia","Zimbabwe","Cabo Verde","Comoros","Mauritius","Seychelles","São Tomé and Príncipe","Saint Helena","British Indian Ocean Territory"],
"Europe":["Albania","Austria","Belarus","Belgium","Bosnia and Herzegovina","Bulgaria","Croatia","Cyprus","Czechia","Denmark","Estonia","Finland","France","Germany","Greece","Hungary","Iceland","Ireland","Italy","Kosovo","Latvia","Lithuania","Luxembourg","Moldova","Montenegro","Netherlands","North Macedonia","Norway","Poland","Portugal","Romania","Russia","Serbia","Slovakia","Slovenia","Spain","Sweden","Switzerland","Ukraine","United Kingdom","Andorra","Liechtenstein","Malta","Monaco","San Marino","Vatican City","Faroe Islands","Guernsey","Jersey","Isle of Man","Åland"],
"Asia":["Afghanistan","Armenia","Azerbaijan","Bangladesh","Bhutan","Brunei","Cambodia","China","Georgia","India","Indonesia","Iran","Iraq","Israel","Japan","Jordan","Kazakhstan","Kuwait","Kyrgyzstan","Laos","Lebanon","Malaysia","Mongolia","Myanmar","Nepal","North Korea","Oman","Pakistan","Palestine","Philippines","Qatar","Saudi Arabia","South Korea","Sri Lanka","Syria","Taiwan","Tajikistan","Thailand","Timor-Leste","Turkey","Turkmenistan","United Arab Emirates","Uzbekistan","Vietnam","Yemen","Bahrain","Maldives","Singapore","Hong Kong","Macao"],
"North America":["Bahamas","Belize","Canada","Costa Rica","Cuba","Dominican Republic","El Salvador","Guatemala","Haiti","Honduras","Jamaica","Mexico","Nicaragua","Panama","United States","Trinidad and Tobago","Greenland","Puerto Rico","Antigua and Barbuda","Barbados","Dominica","Grenada","Saint Lucia","Saint Kitts and Nevis","Saint Vincent and the Grenadines","Anguilla","Aruba","Bermuda","British Virgin Islands","Cayman Islands","Curaçao","Montserrat","Sint Maarten","St-Barthélemy","St-Martin","St. Pierre and Miquelon","Turks and Caicos Islands","U.S. Virgin Islands"],
"South America":["Argentina","Bolivia","Brazil","Chile","Colombia","Ecuador","Guyana","Paraguay","Peru","Suriname","Uruguay","Venezuela","Falkland Islands","South Georgia"],
"Oceania":["Australia","Fiji","New Zealand","Papua New Guinea","Solomon Islands","Vanuatu","New Caledonia","Kiribati","Marshall Islands","Micronesia","Nauru","Palau","Samoa","Tonga","Tuvalu","American Samoa","Cook Islands","French Polynesia","Guam","Niue","Norfolk Island","Northern Mariana Islands","Pitcairn Islands","Wallis and Futuna","Ashmore and Cartier Islands","Heard and McDonald Islands","Indian Ocean Territories"],
"Antarctica":["Antarctica","French Southern Lands"]
};

window.WORLD_REGIONS = {
"Western Europe":["France","Germany","Belgium","Netherlands","Luxembourg","Switzerland","Austria","United Kingdom","Ireland","Monaco","Liechtenstein","Andorra","Portugal","Spain","Italy","Malta","San Marino","Vatican City"],
"Nordics & Baltics":["Norway","Sweden","Finland","Denmark","Iceland","Estonia","Latvia","Lithuania"],
"Central & Eastern Europe":["Poland","Czechia","Slovakia","Hungary","Romania","Bulgaria","Moldova","Ukraine","Belarus","Russia"],
"Balkans":["Slovenia","Croatia","Bosnia and Herzegovina","Serbia","Montenegro","Kosovo","Albania","North Macedonia","Greece","Bulgaria","Romania"],
"Caucasus & Turkey":["Turkey","Georgia","Armenia","Azerbaijan","Cyprus"],
"Middle East":["Iran","Iraq","Syria","Lebanon","Israel","Palestine","Jordan","Saudi Arabia","Yemen","Oman","United Arab Emirates","Qatar","Bahrain","Kuwait","Turkey","Cyprus"],
"Central Asia & Mongolia":["Kazakhstan","Uzbekistan","Turkmenistan","Kyrgyzstan","Tajikistan","Afghanistan","Mongolia"],
"South Asia":["India","Pakistan","Bangladesh","Nepal","Bhutan","Sri Lanka","Maldives","Afghanistan"],
"Southeast Asia":["Myanmar","Thailand","Laos","Cambodia","Vietnam","Malaysia","Singapore","Indonesia","Brunei","Philippines","Timor-Leste"],
"East Asia":["China","Japan","South Korea","North Korea","Mongolia","Taiwan"],
"North Africa":["Morocco","Algeria","Tunisia","Libya","Egypt","Sudan"],
"West Africa & Sahel":["Mauritania","Mali","Niger","Chad","Senegal","Gambia","Guinea-Bissau","Guinea","Sierra Leone","Liberia","Côte d'Ivoire","Ghana","Togo","Benin","Nigeria","Burkina Faso","Cabo Verde"],
"Central Africa":["Cameroon","Central African Republic","Chad","Republic of the Congo","DR Congo","Gabon","Equatorial Guinea","São Tomé and Príncipe","Angola"],
"East Africa & Horn":["Ethiopia","Eritrea","Djibouti","Somalia","Kenya","Uganda","Tanzania","Rwanda","Burundi","South Sudan","Sudan"],
"Southern Africa":["South Africa","Namibia","Botswana","Zimbabwe","Zambia","Mozambique","Malawi","Eswatini","Lesotho","Angola","Madagascar","Mauritius","Comoros","Seychelles"],
"Central America & Mexico":["Guatemala","Belize","Honduras","El Salvador","Nicaragua","Costa Rica","Panama","Mexico"],
"Caribbean":["Cuba","Jamaica","Haiti","Dominican Republic","Bahamas","Trinidad and Tobago","Barbados","Saint Lucia","Grenada","Dominica","Antigua and Barbuda","Saint Kitts and Nevis","Saint Vincent and the Grenadines"],
"Andes":["Colombia","Venezuela","Ecuador","Peru","Bolivia","Chile"],
"Southern Cone & Atlantic South America":["Brazil","Argentina","Uruguay","Paraguay","Guyana","Suriname"],
"USA & Canada":["United States","Canada","Mexico","Bahamas","Cuba","Greenland","Bermuda","St. Pierre and Miquelon"],
"South Pacific":["Australia","New Zealand","Papua New Guinea","Fiji","Solomon Islands","Vanuatu","Samoa","Tonga","Kiribati","Micronesia","Marshall Islands","Palau","Nauru","Tuvalu"],
};

// Dependencies and non-sovereign entities: drawn on the map, never used as answers.
window.DEPENDENCIES = ["Antarctica","French Southern Lands","Greenland","Falkland Islands","New Caledonia","Puerto Rico","Saint Helena","British Indian Ocean Territory","Faroe Islands","Guernsey","Jersey","Isle of Man","Åland","Hong Kong","Macao","Anguilla","Aruba","Bermuda","British Virgin Islands","Cayman Islands","Curaçao","Montserrat","Sint Maarten","St-Barthélemy","St-Martin","St. Pierre and Miquelon","Turks and Caicos Islands","U.S. Virgin Islands","South Georgia","American Samoa","Cook Islands","French Polynesia","Guam","Niue","Norfolk Island","Northern Mariana Islands","Pitcairn Islands","Wallis and Futuna","Ashmore and Cartier Islands","Heard and McDonald Islands","Indian Ocean Territories"];

// Regions for sub-national levels.
window.LEVEL_REGIONS = {
usa: {
  "Northeast":["Connecticut","Maine","Massachusetts","New Hampshire","Rhode Island","Vermont","New Jersey","New York","Pennsylvania"],
  "Midwest":["Illinois","Indiana","Michigan","Ohio","Wisconsin","Iowa","Kansas","Minnesota","Missouri","Nebraska","North Dakota","South Dakota"],
  "South":["Delaware","District of Columbia","Florida","Georgia","Maryland","North Carolina","South Carolina","Virginia","West Virginia","Alabama","Kentucky","Mississippi","Tennessee","Arkansas","Louisiana","Oklahoma","Texas"],
  "West":["Arizona","Colorado","Idaho","Montana","Nevada","New Mexico","Utah","Wyoming","Alaska","California","Hawaii","Oregon","Washington"],
},
india: {
  "North":["Jammu and Kashmir","Ladakh","Himachal Pradesh","Punjab","Chandigarh","Haryana","Delhi","Uttarakhand","Uttar Pradesh","Rajasthan"],
  "West":["Gujarat","Maharashtra","Goa","Dadra & Nagar Haveli and Daman & Diu"],
  "Central":["Madhya Pradesh","Chhattisgarh"],
  "East":["Bihar","Jharkhand","West Bengal","Odisha"],
  "Northeast":["Sikkim","Assam","Arunachal Pradesh","Nagaland","Manipur","Mizoram","Tripura","Meghalaya"],
  "South":["Andhra Pradesh","Telangana","Karnataka","Kerala","Tamil Nadu","Puducherry","Lakshadweep","Andaman and Nicobar"],
},
china: {
  "North":["Beijing","Tianjin","Hebei","Shanxi","Inner Mongolia"],
  "Northeast":["Liaoning","Jilin","Heilongjiang"],
  "East":["Shanghai","Jiangsu","Zhejiang","Anhui","Fujian","Jiangxi","Shandong"],
  "South Central":["Henan","Hubei","Hunan","Guangdong","Guangxi","Hainan"],
  "Southwest":["Chongqing","Sichuan","Guizhou","Yunnan","Tibet"],
  "Northwest":["Shaanxi","Gansu","Qinghai","Ningxia","Xinjiang"],
},
brazil: {
  "Norte":["Acre","Amapá","Amazonas","Pará","Rondônia","Roraima","Tocantins"],
  "Nordeste":["Alagoas","Bahia","Ceará","Maranhão","Paraíba","Pernambuco","Piauí","Rio Grande do Norte","Sergipe"],
  "Centro-Oeste":["Distrito Federal","Goiás","Mato Grosso","Mato Grosso do Sul"],
  "Sudeste":["Espírito Santo","Minas Gerais","Rio de Janeiro","São Paulo"],
  "Sul":["Paraná","Rio Grande do Sul","Santa Catarina"],
},
canada: {}, australia: {},
russia: {
  "Central":["Belgorod Oblast","Bryansk Oblast","Ivanovo Oblast","Kaluga Oblast","Kostroma Oblast","Kursk Oblast","Lipetsk Oblast","Moscow Oblast","Moscow (city)","Oryol Oblast","Ryazan Oblast","Smolensk Oblast","Tambov Oblast","Tula Oblast","Tver Oblast","Vladimir Oblast","Voronezh Oblast","Yaroslavl Oblast"],
  "Northwestern":["Arkhangelsk Oblast","Saint Petersburg (city)","Kaliningrad Oblast","Republic of Karelia","Komi Republic","Leningrad Oblast","Murmansk Oblast","Nenets Autonomous Okrug","Novgorod Oblast","Pskov Oblast","Vologda Oblast"],
  "Southern":["Republic of Adygea","Astrakhan Oblast","Republic of Kalmykia","Krasnodar Krai","Rostov Oblast","Volgograd Oblast"],
  "North Caucasian":["Chechen Republic","Republic of Dagestan","Republic of Ingushetia","Kabardino-Balkaria","Karachay-Cherkessia","North Ossetia-Alania","Stavropol Krai"],
  "Volga":["Republic of Bashkortostan","Chuvash Republic","Kirov Oblast","Mari El Republic","Republic of Mordovia","Nizhny Novgorod Oblast","Orenburg Oblast","Penza Oblast","Perm Krai","Samara Oblast","Saratov Oblast","Republic of Tatarstan","Udmurt Republic","Ulyanovsk Oblast"],
  "Ural":["Chelyabinsk Oblast","Khanty-Mansi Autonomous Okrug","Kurgan Oblast","Sverdlovsk Oblast","Tyumen Oblast","Yamalo-Nenets Autonomous Okrug"],
  "Siberian":["Altai Krai","Altai Republic","Irkutsk Oblast","Kemerovo Oblast","Republic of Khakassia","Krasnoyarsk Krai","Novosibirsk Oblast","Omsk Oblast","Tomsk Oblast","Tuva Republic"],
  "Far Eastern":["Republic of Buryatia","Zabaykalsky Krai","Amur Oblast","Chukotka Autonomous Okrug","Kamchatka Krai","Khabarovsk Krai","Magadan Oblast","Primorsky Krai","Sakha Republic (Yakutia)","Sakhalin Oblast","Jewish Autonomous Oblast"],
},
};
