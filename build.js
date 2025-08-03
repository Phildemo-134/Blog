const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const frontMatter = require('front-matter');

// Configuration de marked pour le rendu
marked.use({
  breaks: true,
  gfm: true
});

// Fonction pour lire et remplacer les variables dans un template
function renderTemplate(templatePath, data) {
    try {
        let template = fs.readFileSync(templatePath, 'utf8');
        
        // Remplacer les variables simples
        template = template.replace(/\{\{title\}\}/g, data.title || '');
        template = template.replace(/\{\{content\}\}/g, data.content || '');
        
        // Gérer la classe active pour la navigation
        if (data.currentPage) {
            // Remplacer les classes active pour chaque page
            const pages = ['home', 'blog', 'about', 'faq'];
            pages.forEach(page => {
                const pattern = new RegExp(`\\{\\{#if currentPage\\}\\}\\{\\{#eq currentPage '${page}'\\}\\}active\\{\\{/eq\\}\\}\\{\\{/if\\}\\}`, 'g');
                template = template.replace(pattern, data.currentPage === page ? 'active' : '');
            });
        }
        
        return template;
    } catch (error) {
        console.error(`❌ Erreur lors de la lecture du template ${templatePath}:`, error.message);
        return '';
    }
}

// Fonction pour convertir markdown en HTML avec template
function convertMarkdownToHtmlWithTemplate(markdownFile, outputFile, title, currentPage = '') {
    try {
        const markdownContent = fs.readFileSync(markdownFile, 'utf8');
        const { attributes, body } = frontMatter(markdownContent);
        
        // Convertir le markdown en HTML
        const htmlContent = marked(body);
        
        // Utiliser le titre du front-matter ou le titre par défaut
        const pageTitle = attributes.title || title;
        
        // Générer le HTML complet avec le template
        const fullHtml = renderTemplate('templates/base.html', {
            title: pageTitle,
            content: htmlContent,
            currentPage: currentPage
        });
        
        // Écrire le fichier HTML dans le répertoire dist
        fs.writeFileSync(outputFile, fullHtml);
        console.log(`✅ ${markdownFile} → ${outputFile}`);
    } catch (error) {
        console.error(`❌ Erreur lors de la conversion de ${markdownFile}:`, error.message);
    }
}

// Fonction pour convertir markdown en HTML sans template (pour les articles de blog)
function convertMarkdownToHtmlDirect(markdownFile, outputFile, title, currentPage = '') {
    try {
        const markdownContent = fs.readFileSync(markdownFile, 'utf8');
        const { attributes, body } = frontMatter(markdownContent);
        
        // Convertir le markdown en HTML
        const htmlContent = marked(body);
        
        // Utiliser le titre du front-matter ou le titre par défaut
        const pageTitle = attributes.title || title;
        
        // Générer le HTML complet avec le template
        const fullHtml = renderTemplate('templates/base.html', {
            title: pageTitle,
            content: htmlContent,
            currentPage: currentPage
        });
        
        // Écrire le fichier HTML dans le répertoire dist
        fs.writeFileSync(outputFile, fullHtml);
        console.log(`✅ ${markdownFile} → ${outputFile} (avec template)`);
    } catch (error) {
        console.error(`❌ Erreur lors de la conversion de ${markdownFile}:`, error.message);
    }
}

// Fonction pour créer la page blog avec liste des articles
function createBlogPage() {
    try {
        const blogDir = path.join(__dirname, 'content', 'blog');
        const blogFiles = fs.readdirSync(blogDir).filter(file => file.endsWith('.md'));
        
        const articles = [];
        
        blogFiles.forEach(file => {
            const filePath = path.join(blogDir, file);
            const content = fs.readFileSync(filePath, 'utf8');
            const { attributes } = frontMatter(content);
            
            const slug = file.replace('.md', '');
            const title = attributes.title || slug;
            const date = attributes.date || '';
            const excerpt = attributes.excerpt || '';
            
            articles.push({
                slug: slug,
                title: title,
                date: date,
                excerpt: excerpt
            });
        });
        
        // Générer le HTML de la liste des articles
        let blogListHtml = '<h1>Blog</h1><div class="blog-list">';
        
        articles.forEach(article => {
            blogListHtml += `
                <article class="blog-item">
                    <h2><a href="blog/${article.slug}.html">${article.title}</a></h2>
                    ${article.date ? `<time class="blog-date">${article.date}</time>` : ''}
                    ${article.excerpt ? `<p class="blog-excerpt">${article.excerpt}</p>` : ''}
                </article>
            `;
        });
        
        blogListHtml += '</div>';
        
        // Générer le HTML complet avec le template
        const fullHtml = renderTemplate('templates/base.html', {
            title: 'Blog',
            content: blogListHtml,
            currentPage: 'blog'
        });
        
        fs.writeFileSync('dist/blog.html', fullHtml);
        console.log('✅ Page blog créée');
    } catch (error) {
        console.error('❌ Erreur lors de la création de la page blog:', error.message);
    }
}

// Fonction pour traiter index.html avec le template
function processIndexHtml() {
    try {
        // Lire le contenu du fichier index.html
        const content = fs.readFileSync('index.html', 'utf8');
        
        // Générer le HTML complet avec le template
        const fullHtml = renderTemplate('templates/base.html', {
            title: 'Accueil - Mon Blog',
            content: content,
            currentPage: 'home'
        });
        
        // Écrire le fichier HTML dans le répertoire dist
        fs.writeFileSync('dist/index.html', fullHtml);
        console.log('✅ index.html traité avec le template → dist/index.html');
    } catch (error) {
        console.error('❌ Erreur lors du traitement de index.html:', error.message);
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
    const dirs = ['dist', 'dist/blog', 'dist/assets', 'content', 'content/blog', 'templates'];
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
    
    // Traiter index.html avec le template
    processIndexHtml();
    
    // Convertir les pages principales (sauf index.html qui est traité séparément)
    const pages = [
        { input: 'content/about.md', output: 'dist/about.html', title: 'À propos', currentPage: 'about', useTemplate: true },
        { input: 'content/faq.md', output: 'dist/faq.html', title: 'FAQ', currentPage: 'faq', useTemplate: true }
    ];
    
    pages.forEach(page => {
        if (fs.existsSync(page.input)) {
            if (page.useTemplate) {
                convertMarkdownToHtmlWithTemplate(page.input, page.output, page.title, page.currentPage);
            } else {
                convertMarkdownToHtmlDirect(page.input, page.output, page.title, page.currentPage);
            }
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
            
            convertMarkdownToHtmlDirect(inputPath, outputPath, slug);
        });
    }
    
    // Copier les assets
    copyAssets();
    
    console.log('✅ Build terminé !');
    console.log('📝 Note: Tous les fichiers utilisent maintenant le template templates/base.html');
}

// Exécuter le build si le script est appelé directement
if (require.main === module) {
    build();
}

module.exports = { build, convertMarkdownToHtmlWithTemplate, convertMarkdownToHtmlDirect }; 