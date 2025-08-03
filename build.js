const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const frontMatter = require('front-matter');

// Configuration de marked pour le rendu
marked.use({
  breaks: true,
  gfm: true
});

// Template HTML de base
const htmlTemplate = (title, content, currentPage = '') => `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <link rel="stylesheet" href="assets/style.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
    <header class="header">
        <div class="container">
            <nav class="nav">
                <a href="index.html" class="nav-logo">Mon Blog</a>
                <ul class="nav-menu">
                    <li><a href="index.html" class="nav-link ${currentPage === 'home' ? 'active' : ''}">Accueil</a></li>
                    <li><a href="blog.html" class="nav-link ${currentPage === 'blog' ? 'active' : ''}">Blog</a></li>
                    <li><a href="about.html" class="nav-link ${currentPage === 'about' ? 'active' : ''}">À propos</a></li>
                    <li><a href="faq.html" class="nav-link ${currentPage === 'faq' ? 'active' : ''}">FAQ</a></li>
                </ul>
            </nav>
        </div>
    </header>

    <main class="main">
        <div class="container">
            ${content}
        </div>
    </main>

    <footer class="footer">
        <div class="container">
            <p>&copy; 2024 Mon Blog. Tous droits réservés.</p>
        </div>
    </footer>
</body>
</html>
`;

// Fonction pour convertir markdown en HTML
function convertMarkdownToHtml(markdownFile, outputFile, title, currentPage = '') {
    try {
        const markdownContent = fs.readFileSync(markdownFile, 'utf8');
        const { attributes, body } = frontMatter(markdownContent);
        
        // Convertir le markdown en HTML
        const htmlContent = marked(body);
        
        // Utiliser le titre du front-matter ou le titre par défaut
        const pageTitle = attributes.title || title;
        
        // Générer le HTML complet
        const fullHtml = htmlTemplate(pageTitle, htmlContent, currentPage);
        
        // Écrire le fichier HTML dans le répertoire dist
        fs.writeFileSync(outputFile, fullHtml);
        console.log(`✅ ${markdownFile} → ${outputFile}`);
    } catch (error) {
        console.error(`❌ Erreur lors de la conversion de ${markdownFile}:`, error.message);
    }
}

// Fonction pour créer la page blog avec liste des articles
function createBlogPage() {
    try {
        const blogDir = path.join(__dirname, 'content', 'blog');
        const blogFiles = fs.readdirSync(blogDir).filter(file => file.endsWith('.md'));
        
        let blogListHtml = '<h1>Blog</h1><div class="blog-list">';
        
        blogFiles.forEach(file => {
            const filePath = path.join(blogDir, file);
            const content = fs.readFileSync(filePath, 'utf8');
            const { attributes } = frontMatter(content);
            
            const slug = file.replace('.md', '');
            const title = attributes.title || slug;
            const date = attributes.date || '';
            const excerpt = attributes.excerpt || '';
            
            blogListHtml += `
                <article class="blog-item">
                    <h2><a href="blog/${slug}.html">${title}</a></h2>
                    ${date ? `<time class="blog-date">${date}</time>` : ''}
                    ${excerpt ? `<p class="blog-excerpt">${excerpt}</p>` : ''}
                </article>
            `;
        });
        
        blogListHtml += '</div>';
        
        const fullHtml = htmlTemplate('Blog', blogListHtml, 'blog');
        fs.writeFileSync('dist/blog.html', fullHtml);
        console.log('✅ Page blog créée');
    } catch (error) {
        console.error('❌ Erreur lors de la création de la page blog:', error.message);
    }
}

// Fonction pour copier les assets
function copyAssets() {
    try {
        // Copier le fichier CSS
        if (fs.existsSync('assets/style.css')) {
            fs.copyFileSync('assets/style.css', 'dist/assets/style.css');
            console.log('✅ assets/style.css copié vers dist/assets/style.css');
        }
    } catch (error) {
        console.error('❌ Erreur lors de la copie des assets:', error.message);
    }
}

// Fonction principale de build
function build() {
    console.log('🚀 Début du build...');
    
    // Créer les dossiers nécessaires
    const dirs = ['dist', 'dist/blog', 'dist/assets', 'content', 'content/blog'];
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
    
    // Convertir les pages principales
    const pages = [
        { input: 'content/index.md', output: 'dist/index.html', title: 'Accueil', currentPage: 'home' },
        { input: 'content/about.md', output: 'dist/about.html', title: 'À propos', currentPage: 'about' },
        { input: 'content/faq.md', output: 'dist/faq.html', title: 'FAQ', currentPage: 'faq' }
    ];
    
    pages.forEach(page => {
        if (fs.existsSync(page.input)) {
            convertMarkdownToHtml(page.input, page.output, page.title, page.currentPage);
        }
    });
    
    // Créer la page blog
    createBlogPage();
    
    // Convertir les articles de blog
    const blogDir = path.join(__dirname, 'content', 'blog');
    if (fs.existsSync(blogDir)) {
        const blogFiles = fs.readdirSync(blogDir).filter(file => file.endsWith('.md'));
        
        blogFiles.forEach(file => {
            const slug = file.replace('.md', '');
            const inputPath = path.join(blogDir, file);
            const outputPath = `dist/blog/${slug}.html`;
            
            convertMarkdownToHtml(inputPath, outputPath, slug);
        });
    }
    
    // Copier les assets
    copyAssets();
    
    console.log('✅ Build terminé !');
}

// Exécuter le build si le script est appelé directement
if (require.main === module) {
    build();
}

module.exports = { build, convertMarkdownToHtml }; 