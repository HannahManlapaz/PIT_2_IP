import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'library.settings')
django.setup()

import cloudinary.uploader
from app.models import Book

file_map = {
    'The Alchemist': 'thealchemist.jpg',
    'Things Fall Apart': 'thingsfallapart.jpg',
    'One Hundred Years of Solitude': 'onehundredyearsofsolitude.webp',
    'The Great Gatsby': 'the-great-gatsby-9781982146702_hr.jpg',
    '1984': '1984.png',
    'Demon Copperhead': 'demoncopperhead.webp',
    'Don Quixote': 'donquixote.webp',
    'The Woman Who Had Two Navels': 'thewomanwhohadtwonavels.webp',
    'To Kill a Mockingbird': 'book-cover-To-Kill-a-Mockingbird-many-1961.webp',
    'Dogeaters': 'dog.webp',
    'Romeo and Juliet': 'romeoandjulie.jpg',
    'Hamlet': 'hamlet.webp',
    'The Book Thief': 'thebooktheif.jpg',
    'The Old Man and the Sea': 'oldman.webp',
    'Noli Me Tangere': 'nolimetangere.jpg',
    'The Stranger': 'the-stranger-albert-camus-vintage-edition.jpg',
    'Pride and Prejudice': 'prideandprejudice.jpg',
    'Mrs Dalloway': 'mrsdalloway.jpg',
    'Great Expectations': 'greatexpectations.webp',
}

for book in Book.objects.all():
    filename = file_map.get(book.title)
    if not filename:
        print(f"⚠️  No mapping for: {book.title}")
        continue

    local_path = os.path.join('media', 'book_covers', filename)
    if not os.path.exists(local_path):
        print(f"❌ File not found: {local_path}")
        continue

    public_id = str(book.cover_image).replace('book_covers/', '')
    print(f"Uploading: {book.title} → {public_id}")
    result = cloudinary.uploader.upload(
        local_path,
        public_id=f"book_covers/{public_id}",
        overwrite=True,
        invalidate=True,
    )
    print(f"  ✅ {result['secure_url']}")

print("Done!")