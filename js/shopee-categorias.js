// Categorias do catálogo (Data Feed) da Shopee em português — dicionário fixo, traduzido uma vez (sem API e sem custo).
// O catálogo manda "Nível 1 › Nível 2" em inglês (ex.: "Home & Living › Home Organizers"); cada parte é traduzida separadamente.
// Parte que não está aqui: aparece em inglês e entra na lista "Categorias sem tradução" do painel (Teste Shopee), onde dá para traduzir;
// essas traduções ficam na tabela cr_category_translations e valem por cima deste dicionário.
// Usado só no painel (aba Teste Shopee). O site público não carrega este arquivo.

export const CATEGORIAS = {
  // ---- nível 1
  'Women Clothes': 'Roupas Femininas', 'Men Clothes': 'Roupas Masculinas', 'Women Shoes': 'Calçados Femininos', 'Men Shoes': 'Calçados Masculinos',
  'Women Bags': 'Bolsas Femininas', 'Men Bags': 'Bolsas Masculinas', 'Fashion Accessories': 'Acessórios de Moda', 'Watches': 'Relógios',
  'Health': 'Saúde', 'Beauty': 'Beleza', 'Beauty & Personal Care': 'Beleza e Cuidados Pessoais', 'Personal Care': 'Cuidados Pessoais',
  'Mobile & Gadgets': 'Celulares e Dispositivos', 'Computers & Accessories': 'Computadores e Acessórios', 'Home Appliances': 'Eletrodomésticos',
  'Audio': 'Áudio', 'Cameras & Drones': 'Câmeras e Drones', 'Gaming & Consoles': 'Games e Consoles', 'Home & Living': 'Casa e Decoração',
  'Sports & Outdoors': 'Esportes e Lazer', 'Stationery': 'Papelaria', 'Hobbies & Collections': 'Hobbies e Coleções', 'Automobiles': 'Automóveis',
  'Automotive': 'Automotivo', 'Motorcycles': 'Motos', 'Mom & Baby': 'Mãe e Bebê', 'Baby & Kids Fashion': 'Moda Infantil e Bebê',
  'Kids Fashion': 'Moda Infantil', 'Toys': 'Brinquedos', 'Toys, Kids & Babies': 'Brinquedos, Crianças e Bebês', 'Pets': 'Pets',
  'Food & Beverages': 'Alimentos e Bebidas', 'Groceries': 'Mercado', 'Books & Magazines': 'Livros e Revistas', 'Travel & Luggage': 'Viagem e Bagagem',
  'Tickets, Vouchers & Services': 'Ingressos, Vales e Serviços', 'Digital Goods & Vouchers': 'Produtos Digitais e Vales', 'Muslim Fashion': 'Moda Muçulmana',
  'Electronics': 'Eletrônicos', 'Furniture': 'Móveis', 'Tools & Home Improvement': 'Ferramentas e Construção', 'Garden': 'Jardim', 'Others': 'Outros',
  'Jewelry & Accessories': 'Joias e Acessórios', 'Jewellery & Accessories': 'Joias e Acessórios', 'Fashion': 'Moda', 'Kids & Babies': 'Crianças e Bebês',

  // ---- roupas
  'Tops': 'Blusas e Camisetas', 'Dresses': 'Vestidos', 'Pants & Leggings': 'Calças e Leggings', 'Pants': 'Calças', 'Leggings': 'Leggings',
  'Shorts': 'Shorts', 'Skirts': 'Saias', 'Jeans': 'Jeans', 'Jackets, Coats & Vests': 'Jaquetas, Casacos e Coletes', 'Jackets & Coats': 'Jaquetas e Casacos',
  'Hoodies & Sweatshirts': 'Moletons', 'Sweaters & Cardigans': 'Suéteres e Cardigãs', 'Sweaters': 'Suéteres', 'Jumpsuits, Playsuits & Overalls': 'Macacões e Jardineiras',
  'Jumpsuits & Rompers': 'Macacões', 'Sets': 'Conjuntos', 'Lingerie & Underwear': 'Lingerie e Roupa Íntima', 'Lingerie': 'Lingerie',
  'Underwear': 'Roupa Íntima', 'Sleepwear & Pajamas': 'Pijamas e Roupas de Dormir', 'Sleepwear': 'Pijamas', 'Swimwear': 'Moda Praia',
  'Maternity Wear': 'Roupas de Gestante', 'Traditional Wear': 'Roupas Tradicionais', 'Costumes': 'Fantasias', 'Fabric': 'Tecidos',
  'Socks & Stockings': 'Meias e Meias-calças', 'Socks': 'Meias', 'Plus Size': 'Plus Size', 'Shirts': 'Camisas', 'T-Shirts': 'Camisetas',
  'Polo Shirts': 'Camisas Polo', 'Tank Tops': 'Regatas', 'Blouses': 'Blusas', 'Suits': 'Ternos', 'Suits & Blazers': 'Ternos e Blazers',
  'Activewear': 'Roupas Fitness', 'Sportswear': 'Roupas Esportivas', 'Outerwear': 'Agasalhos', 'Coats': 'Casacos', 'Vests': 'Coletes',
  'Bodysuits': 'Bodies', 'Crop Tops': 'Cropped', 'Others Clothing': 'Outras Roupas', 'Other Clothing': 'Outras Roupas',

  // ---- calçados
  'Boots': 'Botas', 'Flats': 'Sapatilhas', 'Sneakers': 'Tênis', 'Heels': 'Saltos', 'High Heels': 'Saltos Altos', 'Wedges': 'Anabelas',
  'Sandals & Flip Flops': 'Sandálias e Chinelos', 'Sandals': 'Sandálias', 'Flip Flops': 'Chinelos', 'Slippers': 'Pantufas e Chinelos',
  'Loafers & Boat Shoes': 'Mocassins e Dockside', 'Loafers': 'Mocassins', 'Oxfords & Lace-Ups': 'Sapatos Sociais', 'Formal Shoes': 'Sapatos Sociais',
  'Slip Ons, Mary Janes & Mules': 'Slip-ons, Boneca e Mules', 'Shoe Care & Accessories': 'Cuidados e Acessórios para Calçados',
  'Sports Footwear': 'Calçados Esportivos', 'Boy Shoes': 'Calçados Infantis Masculinos', 'Girl Shoes': 'Calçados Infantis Femininos',
  'Baby Mittens & Footwear': 'Luvas e Sapatinhos de Bebê', 'Kids Shoes': 'Calçados Infantis',

  // ---- bolsas e acessórios
  'Backpacks': 'Mochilas', 'Laptop Bags': 'Bolsas para Notebook', 'Clutches & Wristlets': 'Clutches e Bolsas de Mão', 'Clutches': 'Clutches',
  'Waist Bags & Chest Bags': 'Pochetes e Bolsas de Peito', 'Waist Bags': 'Pochetes', 'Tote Bags': 'Bolsas Tote', 'Top-handle Bags': 'Bolsas de Mão',
  'Crossbody & Shoulder Bags': 'Bolsas Transversais e de Ombro', 'Shoulder Bags': 'Bolsas de Ombro', 'Crossbody Bags': 'Bolsas Transversais',
  'Wallets': 'Carteiras', 'Bag Accessories': 'Acessórios para Bolsas', 'Briefcases': 'Pastas', 'Rings': 'Anéis', 'Earrings': 'Brincos',
  'Necklaces': 'Colares', 'Bracelets & Bangles': 'Pulseiras e Braceletes', 'Bracelets': 'Pulseiras', 'Anklets': 'Tornozeleiras',
  'Eyewear': 'Óculos', 'Sunglasses': 'Óculos de Sol', 'Hair Accessories': 'Acessórios de Cabelo', 'Hats & Caps': 'Chapéus e Bonés',
  'Belts': 'Cintos', 'Scarves & Shawls': 'Lenços e Xales', 'Gloves': 'Luvas', 'Ties, Bow Ties & Cravats': 'Gravatas', 'Ties': 'Gravatas',
  'Additional Accessories': 'Outros Acessórios', 'Jewelry': 'Joias', 'Jewellery': 'Joias', 'Accessories Sets & Packages': 'Kits de Acessórios',
  "Women Watches": 'Relógios Femininos', "Men Watches": 'Relógios Masculinos', 'Couple Watches': 'Relógios de Casal', 'Kids Watches': 'Relógios Infantis',
  'Watches Accessories': 'Acessórios para Relógios', 'Watch Accessories': 'Acessórios para Relógios',

  // ---- beleza e saúde
  'Makeup': 'Maquiagem', 'Skincare': 'Cuidados com a Pele', 'Hair Care': 'Cuidados com o Cabelo', 'Fragrances': 'Perfumes', 'Perfumes & Fragrances': 'Perfumes',
  'Bath & Body Care': 'Banho e Corpo', 'Hand, Foot & Nail Care': 'Mãos, Pés e Unhas', 'Nail Care': 'Unhas', 'Men\'s Care': 'Cuidados Masculinos',
  'Beauty Tools': 'Acessórios de Beleza', 'Beauty Devices': 'Aparelhos de Beleza', 'Makeup Accessories': 'Acessórios de Maquiagem',
  'Beauty Sets & Packages': 'Kits de Beleza', 'Food Supplement': 'Suplementos Alimentares', 'Supplements': 'Suplementos', 'Medical Supplies': 'Artigos Médicos',
  'Personal Care Appliances': 'Aparelhos de Cuidado Pessoal', 'Sexual Wellness': 'Bem-estar Sexual', 'Oral Care': 'Saúde Bucal', 'Feminine Care': 'Higiene Feminina',
  'Eye Care': 'Cuidados com os Olhos', 'Fitness & Wellness': 'Fitness e Bem-estar', 'Adult Diapers & Incontinence': 'Fraldas Geriátricas',

  // ---- celulares, informática, eletrônicos
  'Mobile Phones': 'Celulares', 'Smartphones': 'Celulares', 'Tablets': 'Tablets', 'Wearable Devices': 'Dispositivos Vestíveis', 'Smartwatches': 'Relógios Inteligentes',
  'Accessories': 'Acessórios', 'Cases, Covers & Skins': 'Capas e Películas', 'Cases & Covers': 'Capinhas', 'Screen Protectors': 'Películas',
  'Chargers': 'Carregadores', 'Cables, Chargers & Converters': 'Cabos, Carregadores e Adaptadores', 'Cables & Converters': 'Cabos e Adaptadores',
  'Powerbanks & Batteries': 'Carregadores Portáteis e Baterias', 'Power Banks': 'Carregadores Portáteis', 'Phone Holders': 'Suportes para Celular',
  'Selfie Sticks & Tripods': 'Paus de Selfie e Tripés', 'Memory Cards': 'Cartões de Memória', 'Sim Cards': 'Chips', 'Mobile Accessories': 'Acessórios para Celular',
  'Desktop Computers': 'Computadores de Mesa', 'Laptops': 'Notebooks', 'Monitors': 'Monitores', 'Desktop & Laptop Components': 'Peças de Computador',
  'Data Storage': 'Armazenamento', 'Network Components': 'Redes e Roteadores', 'Networking': 'Redes', 'Printers & Scanners': 'Impressoras e Scanners',
  'Software': 'Programas', 'Keyboards & Mice': 'Teclados e Mouses', 'Keyboards': 'Teclados', 'Mice': 'Mouses', 'Computer Accessories': 'Acessórios de Informática',
  'Laptop Accessories': 'Acessórios para Notebook', 'Office Equipment': 'Equipamentos de Escritório',
  'Earphones, Headphones & Headsets': 'Fones de Ouvido', 'Earphones': 'Fones de Ouvido', 'Headphones': 'Headphones', 'Headsets': 'Headsets',
  'Speakers': 'Caixas de Som', 'Media Players': 'Reprodutores de Mídia', 'Microphones': 'Microfones', 'Amplifiers & Mixers': 'Amplificadores e Mesas de Som',
  'Home Audio & Speakers': 'Som para Casa', 'Audio & Video Cables & Converters': 'Cabos de Áudio e Vídeo', 'Audio Accessories': 'Acessórios de Áudio',
  'Cameras': 'Câmeras', 'Security Cameras & Systems': 'Câmeras de Segurança', 'Drones': 'Drones', 'Lenses': 'Lentes', 'Camera Accessories': 'Acessórios para Câmera',
  'Action Cameras': 'Câmeras de Ação', 'Console Accessories': 'Acessórios para Console', 'Consoles': 'Consoles', 'Video Games': 'Jogos de Videogame',
  'Gaming Accessories': 'Acessórios Gamer', 'TVs & Accessories': 'TVs e Acessórios', 'Televisions': 'Televisores', 'TV Accessories': 'Acessórios para TV',
  'Projectors & Accessories': 'Projetores e Acessórios', 'Batteries': 'Pilhas e Baterias', 'Lighting': 'Iluminação',

  // ---- eletrodomésticos
  'Large Household Appliances': 'Eletrodomésticos Grandes', 'Small Household Appliances': 'Eletrodomésticos Pequenos', 'Small Kitchen Appliances': 'Eletroportáteis de Cozinha',
  'Large Kitchen Appliances': 'Eletrodomésticos de Cozinha', 'Kitchen Appliances': 'Eletrodomésticos de Cozinha', 'Cooling & Heating': 'Ventilação e Aquecimento',
  'Fans': 'Ventiladores', 'Air Conditioners': 'Ar-condicionado', 'Air Purifiers': 'Purificadores de Ar', 'Humidifiers & Dehumidifiers': 'Umidificadores e Desumidificadores',
  'Vacuum Cleaners & Floor Care Appliances': 'Aspiradores e Limpeza de Piso', 'Vacuum Cleaners': 'Aspiradores de Pó', 'Garment Care': 'Cuidados com Roupas',
  'Irons & Steamers': 'Ferros de Passar e Vaporizadores', 'Washing Machines & Dryers': 'Máquinas de Lavar e Secadoras', 'Refrigerators & Freezers': 'Geladeiras e Freezers',
  'Water Heaters': 'Aquecedores de Água', 'Water Purifiers & Dispensers': 'Purificadores e Bebedouros', 'Blenders & Juicers': 'Liquidificadores e Espremedores',
  'Rice Cookers': 'Panelas Elétricas de Arroz', 'Air Fryers': 'Fritadeiras Elétricas', 'Microwaves & Ovens': 'Micro-ondas e Fornos', 'Coffee Machines': 'Cafeteiras',
  'Electric Kettles': 'Chaleiras Elétricas', 'Cooktops & Ranges': 'Cooktops e Fogões', 'Appliance Parts & Accessories': 'Peças e Acessórios para Eletrodomésticos',

  // ---- casa
  'Home Organizers': 'Organizadores', 'Home Care Supplies': 'Produtos de Limpeza', 'Cleaning Supplies': 'Produtos de Limpeza', 'Kitchenware': 'Utensílios de Cozinha',
  'Kitchen & Dining': 'Cozinha e Mesa', 'Dinnerware': 'Louças', 'Cookware': 'Panelas', 'Bakeware': 'Formas e Assadeiras', 'Drinkware': 'Copos e Garrafas',
  'Food Storage': 'Potes e Armazenamento', 'Bedding': 'Cama', 'Bed Linens': 'Roupa de Cama', 'Pillows': 'Travesseiros', 'Bath': 'Banho',
  'Bathrooms': 'Banheiro', 'Bathroom': 'Banheiro', 'Towels': 'Toalhas', 'Home Decor': 'Decoração', 'Decoration': 'Decoração', 'Furnitures': 'Móveis',
  'Gardening': 'Jardinagem', 'Tools & Home Improvement ': 'Ferramentas e Construção', 'Tools': 'Ferramentas', 'Power Tools': 'Ferramentas Elétricas',
  'Hand Tools': 'Ferramentas Manuais', 'Home Improvement': 'Reforma e Construção', 'Lighting & Lamps': 'Iluminação e Luminárias', 'Lamps': 'Luminárias',
  'Party Supplies': 'Artigos de Festa', 'Fengshui & Religious Supplies': 'Artigos Religiosos e Feng Shui', 'Laundry Care': 'Lavanderia',
  'Safety & Security': 'Segurança', 'Home Fragrance & Aromatherapy': 'Aromatizadores', 'Mosquito & Pest Control': 'Repelentes e Controle de Pragas',
  'Curtains & Blinds': 'Cortinas e Persianas', 'Rugs & Carpets': 'Tapetes', 'Mirrors': 'Espelhos', 'Clocks': 'Relógios de Parede', 'Storage': 'Armazenamento',

  // ---- esportes, lazer, papelaria, hobbies
  'Sports & Outdoor Apparels': 'Roupas Esportivas', 'Sports & Outdoor Recreation Equipments': 'Equipamentos Esportivos', 'Sports Equipment': 'Equipamentos Esportivos',
  'Camping & Hiking': 'Camping e Trilha', 'Fishing': 'Pesca', 'Cycling': 'Ciclismo', 'Bicycles': 'Bicicletas', 'Fitness Equipment': 'Equipamentos de Ginástica',
  'Yoga & Pilates': 'Ioga e Pilates', 'Swimming': 'Natação', 'Football': 'Futebol', 'Soccer': 'Futebol', 'Basketball': 'Basquete', 'Badminton': 'Badminton',
  'Golf': 'Golfe', 'Boxing & Martial Arts': 'Boxe e Artes Marciais', 'Skateboarding': 'Skate', 'Sports Bags': 'Bolsas Esportivas', 'Sports Accessories': 'Acessórios Esportivos',
  'Writing & Correction': 'Escrita e Corretivos', 'Notebooks & Papers': 'Cadernos e Papéis', 'Notebooks & Paper Products': 'Cadernos e Papéis',
  'School & Office Supplies': 'Material Escolar e de Escritório', 'Office Supplies': 'Material de Escritório', 'Art Supplies': 'Material de Arte',
  'Gift & Wrapping': 'Presentes e Embalagens', 'Letters & Envelopes': 'Cartas e Envelopes', 'Paper Supplies': 'Papéis',
  'Collectibles': 'Colecionáveis', 'Musical Instruments & Accessories': 'Instrumentos Musicais e Acessórios', 'Musical Instruments': 'Instrumentos Musicais',
  'Handicrafts': 'Artesanato', 'Souvenirs': 'Lembrancinhas', 'Photo Albums': 'Álbuns de Fotos', 'Toy Games': 'Jogos e Brinquedos',

  // ---- automotivo e motos
  'Automobile Exterior Accessories': 'Acessórios Externos para Carro', 'Automobile Interior Accessories': 'Acessórios Internos para Carro',
  'Automobile Electronics': 'Eletrônicos para Carro', 'Automobile Spare Parts': 'Peças para Carro', 'Automobile Care': 'Cuidados com o Carro',
  'Automotive Oils & Lubes': 'Óleos e Lubrificantes', 'Automobile Tools & Accessories': 'Ferramentas e Acessórios para Carro', 'Car Accessories': 'Acessórios para Carro',
  'Car Electronics': 'Eletrônicos Automotivos', 'Car Care': 'Cuidados com o Carro', 'Car Parts': 'Peças Automotivas', 'Tires & Wheels': 'Pneus e Rodas',
  'Motorcycle Accessories': 'Acessórios para Moto', 'Motorcycle Spare Parts': 'Peças para Moto', 'Motorcycle Helmets & Accessories': 'Capacetes e Acessórios para Moto',
  'Helmets': 'Capacetes', 'Riding Gear': 'Equipamentos de Pilotagem',

  // ---- mãe e bebê, brinquedos, pets, alimentos, livros, viagem
  'Baby Travel Essentials': 'Passeio do Bebê', 'Feeding Essentials': 'Alimentação do Bebê', 'Maternity Accessories': 'Acessórios para Gestante',
  'Maternity Healthcare': 'Saúde da Gestante', 'Bath & Body Care ': 'Banho e Corpo', 'Nursery': 'Quarto do Bebê', 'Baby Safety': 'Segurança do Bebê',
  'Diapering & Potty': 'Fraldas e Penicos', 'Diapers': 'Fraldas', 'Baby Clothes': 'Roupas de Bebê', 'Baby Toys': 'Brinquedos para Bebê',
  'Boy Clothes': 'Roupas de Menino', 'Girl Clothes': 'Roupas de Menina', 'Kids Clothes': 'Roupas Infantis', 'Kids Accessories': 'Acessórios Infantis',
  'Dolls & Stuffed Toys': 'Bonecas e Pelúcias', 'Educational Toys': 'Brinquedos Educativos', 'Sports & Outdoor Play': 'Brinquedos ao Ar Livre',
  'Toy Vehicles': 'Carrinhos', 'Building Blocks': 'Blocos de Montar', 'Board Games': 'Jogos de Tabuleiro', 'Puzzles': 'Quebra-cabeças', 'Toy Weapons': 'Armas de Brinquedo',
  'Dog Care': 'Cães', 'Cat Care': 'Gatos', 'Pet Food': 'Ração', 'Pet Accessories': 'Acessórios para Pets', 'Pet Toys': 'Brinquedos para Pets',
  'Pet Grooming': 'Higiene e Beleza Pet', 'Pet Healthcare': 'Saúde Pet', 'Pet Clothing & Accessories': 'Roupas e Acessórios para Pets', 'Aquarium': 'Aquarismo',
  'Snacks': 'Petiscos', 'Beverages': 'Bebidas', 'Cooking Essentials': 'Itens de Cozinha', 'Breakfast Cereals & Spread': 'Cafés da Manhã e Pastas',
  'Baking Needs': 'Confeitaria', 'Instant Food': 'Comida Pronta', 'Gift Set & Hampers': 'Cestas e Kits de Presente', 'Alcoholic Beverages': 'Bebidas Alcoólicas',
  'Books': 'Livros', 'Magazines & Newspapers': 'Revistas e Jornais', 'E-Books': 'Livros Digitais', 'Luggage': 'Malas', 'Travel Bags': 'Bolsas de Viagem',
  'Travel Accessories': 'Acessórios de Viagem',
};

// palavras comuns de produtos (para a busca achar em português e em inglês)
export const PALAVRAS = [
  ['vestido', 'dress'], ['blusa', 'blouse', 'top'], ['camiseta', 't-shirt', 'tshirt', 'tee'], ['camisa', 'shirt'], ['calca', 'pants', 'trousers'],
  ['saia', 'skirt'], ['short', 'shorts'], ['jaqueta', 'jacket'], ['casaco', 'coat'], ['moletom', 'hoodie', 'sweatshirt'], ['meia', 'socks', 'sock'],
  ['sutia', 'bra'], ['calcinha', 'panties'], ['pijama', 'pajamas', 'pyjamas', 'sleepwear'], ['biquini', 'bikini'], ['maio', 'swimsuit'],
  ['sapato', 'shoe', 'shoes'], ['tenis', 'sneaker', 'sneakers'], ['bota', 'boot', 'boots'], ['sandalia', 'sandal', 'sandals'], ['chinelo', 'slipper', 'slippers', 'flip flop'],
  ['bolsa', 'bag', 'handbag'], ['mochila', 'backpack'], ['carteira', 'wallet'], ['relogio', 'watch'], ['oculos', 'glasses', 'sunglasses'],
  ['brinco', 'earring', 'earrings'], ['colar', 'necklace'], ['anel', 'ring'], ['pulseira', 'bracelet'], ['bone', 'cap'], ['chapeu', 'hat'], ['cinto', 'belt'],
  ['maquiagem', 'makeup'], ['batom', 'lipstick'], ['perfume', 'perfume', 'fragrance'], ['shampoo', 'shampoo'], ['creme', 'cream'], ['protetor solar', 'sunscreen'],
  ['celular', 'phone', 'smartphone'], ['capinha', 'case', 'phone case'], ['pelicula', 'screen protector'], ['carregador', 'charger'], ['cabo', 'cable'],
  ['fone', 'earphone', 'earphones', 'headphone', 'headphones', 'headset', 'earbuds'], ['caixa de som', 'speaker'], ['notebook', 'laptop'], ['teclado', 'keyboard'],
  ['mouse', 'mouse'], ['camera', 'camera'], ['carregador portatil', 'power bank', 'powerbank'], ['relogio inteligente', 'smartwatch'],
  ['panela', 'pot', 'pan', 'cookware'], ['frigideira', 'frying pan', 'skillet'], ['copo', 'cup', 'glass'], ['garrafa', 'bottle'], ['pote', 'container', 'jar'],
  ['toalha', 'towel'], ['travesseiro', 'pillow'], ['lencol', 'bed sheet', 'sheet'], ['cortina', 'curtain'], ['tapete', 'rug', 'carpet'], ['luminaria', 'lamp'],
  ['organizador', 'organizer'], ['ventilador', 'fan'], ['aspirador', 'vacuum'], ['liquidificador', 'blender'], ['fritadeira', 'air fryer', 'fryer'],
  ['ferramenta', 'tool', 'tools'], ['furadeira', 'drill'], ['brinquedo', 'toy', 'toys'], ['boneca', 'doll'], ['pelucia', 'plush', 'stuffed'],
  ['quebra-cabeca', 'puzzle'], ['carrinho', 'toy car', 'stroller'], ['bebe', 'baby'], ['infantil', 'kids', 'children', 'child'], ['feminino', 'women', 'womens', 'female', 'ladies'],
  ['masculino', 'men', 'mens', 'male'], ['cachorro', 'dog'], ['gato', 'cat'], ['racao', 'pet food'], ['carro', 'car', 'automotive'], ['moto', 'motorcycle'],
  ['capacete', 'helmet'], ['bicicleta', 'bicycle', 'bike'], ['academia', 'gym', 'fitness'], ['ioga', 'yoga'], ['caderno', 'notebook paper'], ['caneta', 'pen'],
  ['mala', 'luggage', 'suitcase'], ['kit', 'set'], ['sem fio', 'wireless'], ['portatil', 'portable'], ['inteligente', 'smart'],
];

const nz = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const DIC = new Map(Object.entries(CATEGORIAS).map(([k, v]) => [nz(k), v]));
const SEP = /\s*[›>\/|]\s*/;

// extra = traduções digitadas no painel { 'Home Organizers': 'Organizadores' } (valem por cima do dicionário)
export function traduzirParte(parte, extra = {}) {
  const k = nz(parte);
  for (const [o, p] of Object.entries(extra || {})) if (nz(o) === k && String(p || '').trim()) return String(p).trim();
  return DIC.get(k) || null;
}
// "Home & Living › Home Organizers" → "Casa e Decoração › Organizadores" (parte sem tradução fica como veio)
export function traduzirCategoria(cat, extra = {}) {
  const partes = String(cat || '').split(SEP).filter(Boolean);
  return partes.map((p) => traduzirParte(p, extra) || p).join(' › ');
}
// partes ainda sem tradução (para a lista "Categorias sem tradução")
export function semTraducao(cat, extra = {}) {
  return String(cat || '').split(SEP).filter(Boolean).filter((p) => p !== '(sem categoria)' && !traduzirParte(p, extra));
}

// palavras equivalentes (português ↔ inglês) de um termo de busca, sem acento e em minúsculas
export function equivalentes(termo) {
  const t = nz(termo);
  if (!t) return [];
  const out = new Set([t]);
  for (const grupo of PALAVRAS) {
    const g = grupo.map(nz);
    if (g.some((w) => w === t || (t.length >= 4 && (w.startsWith(t) || t.startsWith(w) && w.length >= 4)))) g.forEach((w) => out.add(w));
  }
  return [...out];
}
// o texto (já em minúsculas e sem acento) bate com o termo em português OU em inglês?
// O termo digitado vale como sempre (pedaço do texto). As traduções valem como palavra inteira (ou começo de palavra
// com 5 letras ou mais), para "men" não achar "women" nem "cat" achar "category".
export function bate(texto, termo) {
  const n = nz(texto), t = nz(termo);
  if (!t) return true;
  if (n.includes(t)) return true;
  const pal = n.split(/[^a-z0-9]+/).filter(Boolean), pad = ' ' + pal.join(' ') + ' ';
  // masculino/masculina, vestido/vestidos: compara pela raiz da palavra (5 letras ou mais)
  const raiz = t.includes(' ') ? '' : t.replace(/(os|as|es|o|a|s)$/, '');
  if (raiz.length >= 5 && pal.some((x) => x.startsWith(raiz))) return true;
  return equivalentes(t).filter((w) => w !== t).some((w) => w.includes(' ') ? pad.includes(' ' + w.replace(/[^a-z0-9]+/g, ' ') + ' ')
    : pal.some((x) => x === w || x === w + 's' || (w.length >= 5 && x.startsWith(w))));
}
export const semAcento = nz;
