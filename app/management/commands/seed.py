import requests
from io import BytesIO
from django.core.management.base import BaseCommand
from django.core.files.base import ContentFile
from app.models import Author, Book


class Command(BaseCommand):
    help = 'Seed the database with authors and books (with Cloudinary cover images)'

    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding authors...')
        authors = self.seed_authors()
        self.stdout.write(self.style.SUCCESS(f'  {len(authors)} authors created.'))

        self.stdout.write('Seeding books...')
        count = self.seed_books(authors)
        self.stdout.write(self.style.SUCCESS(f'  {count} books created.'))

        self.stdout.write(self.style.SUCCESS('Done! Database seeded successfully.'))

    def fetch_cover(self, isbn, title):
        url = f'https://covers.openlibrary.org/b/isbn/{isbn}-M.jpg'
        try:
            response = requests.get(url, timeout=10)
            if response.status_code == 200 and len(response.content) > 1000:
                self.stdout.write(f'      Cover fetched for: {title}')
                return ContentFile(response.content, name=f'{isbn}.jpg')
            else:
                self.stdout.write(self.style.WARNING(f'      No cover found for: {title}, using placeholder'))
                return self.fetch_placeholder(isbn)
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'      Failed to fetch cover for {title}: {e}'))
            return self.fetch_placeholder(isbn)

    def fetch_placeholder(self, isbn):
        url = f'https://via.placeholder.com/200x300.png?text=No+Cover'
        try:
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                return ContentFile(response.content, name=f'{isbn}_placeholder.png')
        except Exception:
            pass
        return None

    def seed_authors(self):
        author_data = [
            {
                'name': 'Jose Rizal',
                'biography': 'National hero of the Philippines, novelist, poet, and polymath who articulated the aspirations of his people during the Spanish colonial era. Executed in 1896, his writings ignited the Philippine revolution.',
                'nationality': 'Filipino',
            },
            {
                'name': 'Nick Joaquin',
                'biography': 'One of the most important Filipino writers in English, known for his plays, poems, and novels exploring Philippine history and identity. Awarded the National Artist for Literature in 1976.',
                'nationality': 'Filipino',
            },
            {
                'name': 'F. Sionil Jose',
                'biography': 'Prolific Filipino novelist and one of the most widely read Filipino authors in the English language. His Rosales Saga is considered a cornerstone of Philippine literature.',
                'nationality': 'Filipino',
            },
            {
                'name': 'George Orwell',
                'biography': 'English novelist and essayist best known for his allegorical novella Animal Farm and the dystopian novel Nineteen Eighty-Four. His work remains deeply influential in political literature.',
                'nationality': 'British',
            },
            {
                'name': 'J.K. Rowling',
                'biography': 'British author best known for writing the Harry Potter fantasy series, one of the best-selling book series in history. Her work has been translated into over 80 languages worldwide.',
                'nationality': 'British',
            },
            {
                'name': 'Gabriel Garcia Marquez',
                'biography': 'Colombian novelist and Nobel Prize winner, widely credited with popularizing magical realism through works like One Hundred Years of Solitude.',
                'nationality': 'Colombian',
            },
            {
                'name': 'Fyodor Dostoevsky',
                'biography': 'Russian novelist and philosopher whose works explore human psychology, suffering, and moral dilemmas. His novels are considered foundational texts of existentialism and modern literature.',
                'nationality': 'Russian',
            },
            {
                'name': 'Haruki Murakami',
                'biography': 'Japanese author known for his surrealist fiction blending pop culture with deeper existential themes. His works have been translated into 50 languages and sold millions of copies worldwide.',
                'nationality': 'Japanese',
            },
            {
                'name': 'Toni Morrison',
                'biography': 'American novelist and Nobel Prize laureate known for her powerful explorations of African American life, identity, and trauma. Beloved won the Pulitzer Prize for Fiction in 1988.',
                'nationality': 'American',
            },
            {
                'name': 'Paulo Coelho',
                'biography': 'Brazilian lyricist and novelist best known for The Alchemist, a philosophical novel about following one\'s personal legend. One of the best-selling authors in history with over 225 million books sold.',
                'nationality': 'Brazilian',
            },
        ]

        authors = {}
        for data in author_data:
            author, created = Author.objects.get_or_create(
                name=data['name'],
                defaults={
                    'biography': data['biography'],
                    'nationality': data['nationality'],
                }
            )
            authors[data['name']] = author
            status = 'Created' if created else 'Already exists'
            self.stdout.write(f'    [{status}] {author.name}')

        return authors

    def seed_books(self, authors):
        book_data = [
            {
                'title': 'Noli Me Tangere',
                'isbn': '9789710000248',
                'publication_year': 1887,
                'author': 'Jose Rizal',
                'available': True,
                'description': 'A novel exposing the ills of Spanish colonial rule in the Philippines through the story of Crisostomo Ibarra.',
            },
            {
                'title': 'El Filibusterismo',
                'isbn': '9789710000255',
                'publication_year': 1891,
                'author': 'Jose Rizal',
                'available': True,
                'description': 'The darker sequel to Noli Me Tangere, following the revolutionary Simoun as he plots violent revenge against the Spanish colonial government.',
            },
            {
                'title': 'The Woman Who Had Two Navels',
                'isbn': '9789718505012',
                'publication_year': 1961,
                'author': 'Nick Joaquin',
                'available': True,
                'description': 'A novel exploring the complexities of Filipino identity and colonial history through interconnected lives of Filipino expatriates.',
            },
            {
                'title': 'Cave and Shadows',
                'isbn': '9789718505029',
                'publication_year': 1983,
                'author': 'Nick Joaquin',
                'available': False,
                'description': 'A gripping political thriller set during the Marcos era, following a journalist uncovering dangerous secrets in Manila.',
            },
            {
                'title': 'Po-on (Dusk)',
                'isbn': '9789710001016',
                'publication_year': 1984,
                'author': 'F. Sionil Jose',
                'available': True,
                'description': 'The first book in the Rosales Saga, following the Samson family fleeing persecution and settling in Pangasinan.',
            },
            {
                'title': 'The Pretenders',
                'isbn': '9789710001023',
                'publication_year': 1962,
                'author': 'F. Sionil Jose',
                'available': False,
                'description': 'A novel about Antonio Samson, a Filipino intellectual torn between his poor roots and his wealthy wife\'s world.',
            },
            {
                'title': 'Nineteen Eighty-Four',
                'isbn': '9780452284234',
                'publication_year': 1949,
                'author': 'George Orwell',
                'available': True,
                'description': 'A chilling dystopian novel set in a totalitarian society ruled by Big Brother, exploring surveillance, propaganda, and oppression.',
            },
            {
                'title': 'Animal Farm',
                'isbn': '9780452284241',
                'publication_year': 1945,
                'author': 'George Orwell',
                'available': True,
                'description': 'An allegorical novella in which farm animals overthrow their human farmer, only to find themselves under a new tyranny.',
            },
            {
                'title': 'Harry Potter and the Sorcerer\'s Stone',
                'isbn': '9780439708180',
                'publication_year': 1997,
                'author': 'J.K. Rowling',
                'available': True,
                'description': 'A young orphan discovers he is a wizard and begins his education at Hogwarts School of Witchcraft and Wizardry.',
            },
            {
                'title': 'Harry Potter and the Chamber of Secrets',
                'isbn': '9780439708197',
                'publication_year': 1998,
                'author': 'J.K. Rowling',
                'available': False,
                'description': 'Harry returns to Hogwarts for his second year, where a mysterious force is petrifying students.',
            },
            {
                'title': 'Harry Potter and the Prisoner of Azkaban',
                'isbn': '9780439708203',
                'publication_year': 1999,
                'author': 'J.K. Rowling',
                'available': True,
                'description': 'Harry discovers the truth about his parents\' past and faces the escaped prisoner Sirius Black in his third year.',
            },
            {
                'title': 'One Hundred Years of Solitude',
                'isbn': '9780060883287',
                'publication_year': 1967,
                'author': 'Gabriel Garcia Marquez',
                'available': True,
                'description': 'The epic story of the Buendia family across seven generations in the fictional town of Macondo, a masterpiece of magical realism.',
            },
            {
                'title': 'Love in the Time of Cholera',
                'isbn': '9780143038483',
                'publication_year': 1985,
                'author': 'Gabriel Garcia Marquez',
                'available': False,
                'description': 'A story of unrequited love spanning over fifty years, exploring obsession, aging, and enduring romantic devotion.',
            },
            {
                'title': 'Crime and Punishment',
                'isbn': '9780140449136',
                'publication_year': 1866,
                'author': 'Fyodor Dostoevsky',
                'available': True,
                'description': 'A psychological novel following Raskolnikov after he commits a murder and wrestles with guilt, confession, and redemption.',
            },
            {
                'title': 'The Brothers Karamazov',
                'isbn': '9780374409241',
                'publication_year': 1880,
                'author': 'Fyodor Dostoevsky',
                'available': True,
                'description': 'Dostoevsky\'s final novel, a spiritual drama of faith, doubt, and morality told through the turbulent Karamazov family.',
            },
            {
                'title': 'Norwegian Wood',
                'isbn': '9780375701351',
                'publication_year': 1987,
                'author': 'Haruki Murakami',
                'available': False,
                'description': 'A nostalgic story of loss and first love set in 1960s Tokyo, following student Toru Watanabe and his relationships.',
            },
            {
                'title': 'Kafka on the Shore',
                'isbn': '9781400037209',
                'publication_year': 2002,
                'author': 'Haruki Murakami',
                'available': True,
                'description': 'A surreal coming-of-age novel with two parallel narratives in contemporary Japan, filled with magical realism and talking cats.',
            },
            {
                'title': 'Beloved',
                'isbn': '9780452286251',
                'publication_year': 1987,
                'author': 'Toni Morrison',
                'available': True,
                'description': 'A Pulitzer Prize-winning novel about an escaped slave haunted by the ghost of her daughter, exploring the trauma of slavery.',
            },
            {
                'title': 'The Bluest Eye',
                'isbn': '9780393322620',
                'publication_year': 1970,
                'author': 'Toni Morrison',
                'available': False,
                'description': 'Morrison\'s debut novel about a young Black girl who prays for blue eyes, exploring race, beauty standards, and trauma.',
            },
            {
                'title': 'The Alchemist',
                'isbn': '9780062315007',
                'publication_year': 1988,
                'author': 'Paulo Coelho',
                'available': True,
                'description': 'A philosophical novel about a young shepherd named Santiago who travels from Spain to Egypt in search of his personal legend.',
            },
        ]

        count = 0
        for data in book_data:
            author = authors.get(data['author'])
            if not author:
                self.stdout.write(self.style.WARNING(f"    [Skipped] Author not found for: {data['title']}"))
                continue

            if Book.objects.filter(isbn=data['isbn']).exists():
                self.stdout.write(f"    [Already exists] {data['title']}")
                continue

            book = Book(
                title=data['title'],
                isbn=data['isbn'],
                publication_year=data['publication_year'],
                author=author,
                available=data['available'],
                description=data['description'],
            )

            cover = self.fetch_cover(data['isbn'], data['title'])
            if cover:
                book.cover_image.save(cover.name, cover, save=False)

            book.save()
            self.stdout.write(f'    [Created] {book.title}')
            count += 1

        return count